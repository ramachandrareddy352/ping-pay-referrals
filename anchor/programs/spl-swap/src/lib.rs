#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token, token_2022,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

declare_id!("6Y8WgqjuiRfkPDLErc3ttzHznd4bsNAHiSBGFEmXVboq");

pub const MEA_SPL2022_MINT: Pubkey = pubkey!("mecySk7eSawDNfAXvW3CquhLyxyKaXExFXgUUbEZE1T");
pub const MEA_SPL_MINT: Pubkey = pubkey!("MeaMMYyboH6vpRVGkQF8LkrmS5sj925UwFcaGcFcSem");
pub const MAX_BPS: u16 = 20;

#[program]
pub mod spl_swap {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee_bps: u16) -> Result<()> {
        let swap_state = &mut ctx.accounts.swap_state;
        if fee_bps > MAX_BPS {
            return Err(SwapError::Unauthorized.into());
        }
        swap_state.initialized = true;
        swap_state.admin = *ctx.accounts.signer.key;
        swap_state.fee_bps = fee_bps;
        Ok(())
    }

    pub fn update_fee(ctx: Context<UpdateState>, fee_bps: u16) -> Result<()> {
        let swap_state = &mut ctx.accounts.swap_state;
        require!(
            swap_state.admin == *ctx.accounts.signer.key,
            SwapError::Unauthorized
        );
        if fee_bps > MAX_BPS {
            return Err(SwapError::Unauthorized.into());
        }
        swap_state.fee_bps = fee_bps;
        Ok(())
    }

    pub fn update_admin(ctx: Context<UpdateState>, new_admin: Pubkey) -> Result<()> {
        let swap_state = &mut ctx.accounts.swap_state;
        require!(
            swap_state.admin == *ctx.accounts.signer.key,
            SwapError::Unauthorized
        );
        swap_state.admin = new_admin;
        Ok(())
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let swap_state = &ctx.accounts.swap_state;
        require!(
            swap_state.admin == *ctx.accounts.signer.key,
            SwapError::Unauthorized
        );

        // Withdraw SPL fees
        let signer_seeds = &[b"treasury".as_ref(), &[ctx.bumps.treasury]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.treasury_mea_spl.to_account_info(),
                    to: ctx.accounts.receiver_mea_spl.to_account_info(),
                    authority: ctx.accounts.treasury.to_account_info(),
                },
                &[signer_seeds],
            ),
            ctx.accounts.treasury_mea_spl.amount,
        )?;

        // Withdraw SPL2022 fees
        token_2022::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_2022_program.to_account_info(),
                token_2022::TransferChecked {
                    from: ctx.accounts.treasury_mea_spl2022.to_account_info(),
                    to: ctx.accounts.receiver_mea_spl2022.to_account_info(),
                    mint: ctx.accounts.mea_2022.to_account_info(),
                    authority: ctx.accounts.treasury.to_account_info(),
                },
                &[signer_seeds],
            ),
            ctx.accounts.treasury_mea_spl2022.amount,
            ctx.accounts.mea_2022.decimals,
        )?;

        Ok(())
    }

    pub fn add2022_reserve(ctx: Context<Add2022Reserve>, amount: u64) -> Result<()> {
        if !ctx.accounts.swap_state.initialized
            || ctx.accounts.signer.key() != ctx.accounts.swap_state.admin
        {
            return Err(SwapError::Unauthorized.into());
        }

        token_2022::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_2022_program.to_account_info(),
                token_2022::TransferChecked {
                    from: ctx.accounts.payer_mea_account.to_account_info(),
                    to: ctx.accounts.vault_mea_2022.to_account_info(),
                    mint: ctx.accounts.mea_2022.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.mea_2022.decimals,
        )?;
        Ok(())
    }

    pub fn add_spl_reserve(ctx: Context<AddSplReserve>, amount: u64) -> Result<()> {
        if !ctx.accounts.swap_state.initialized
            || ctx.accounts.signer.key() != ctx.accounts.swap_state.admin
        {
            return Err(SwapError::Unauthorized.into());
        }

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.payer_mea_account.to_account_info(),
                    to: ctx.accounts.vault_mea_spl.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    pub fn swap_spl_to_spl2022(ctx: Context<SwapSplToSpl2022>, amount: u64) -> Result<()> {
        if !ctx.accounts.swap_state.initialized {
            return Err(SwapError::Unauthorized.into());
        }

        let fee = amount
            .checked_mul(ctx.accounts.swap_state.fee_bps as u64)
            .ok_or(SwapError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(SwapError::MathOverflow)?;
        let amount_after_fee = amount.checked_sub(fee).ok_or(SwapError::MathOverflow)?;

        // Transfer SPL from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.payer_mea_account.to_account_info(),
                    to: ctx.accounts.vault_mea_spl.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            amount_after_fee,
        )?;

        // Transfer fee to treasury
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.payer_mea_account.to_account_info(),
                    to: ctx.accounts.treasury_mea_spl.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            fee,
        )?;

        // Transfer Token-2022 from vault to user
        let signer_seeds = &[b"vault".as_ref(), &[ctx.bumps.vault_authority]];

        token_2022::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_2022_program.to_account_info(),
                token_2022::TransferChecked {
                    from: ctx.accounts.vault_mea_2022.to_account_info(),
                    to: ctx.accounts.receiver_mea_2022.to_account_info(),
                    mint: ctx.accounts.mea_2022.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[signer_seeds],
            ),
            amount_after_fee,
            ctx.accounts.mea_2022.decimals,
        )?;

        Ok(())
    }

    pub fn swap_spl2022_to_spl(ctx: Context<SwapSpl2022ToSpl>, amount: u64) -> Result<()> {
        if !ctx.accounts.swap_state.initialized {
            return Err(SwapError::Unauthorized.into());
        }

        let fee = amount
            .checked_mul(ctx.accounts.swap_state.fee_bps as u64)
            .ok_or(SwapError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(SwapError::MathOverflow)?;
        let amount_after_fee = amount.checked_sub(fee).ok_or(SwapError::MathOverflow)?;

        // Transfer 2022 token to vault
        token_2022::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_2022_program.to_account_info(),
                token_2022::TransferChecked {
                    from: ctx.accounts.payer_mea_account.to_account_info(),
                    to: ctx.accounts.vault_mea_2022.to_account_info(),
                    mint: ctx.accounts.mea_2022.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            amount_after_fee,
            ctx.accounts.mea_2022.decimals,
        )?;

        // Transfer fee to treasury
        token_2022::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_2022_program.to_account_info(),
                token_2022::TransferChecked {
                    from: ctx.accounts.payer_mea_account.to_account_info(),
                    to: ctx.accounts.treasury_mea_spl2022.to_account_info(),
                    mint: ctx.accounts.mea_2022.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            fee,
            ctx.accounts.mea_2022.decimals,
        )?;

        // Send SPL to user
        let signer_seeds = &[b"vault".as_ref(), &[ctx.bumps.vault_authority]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vault_mea_spl.to_account_info(),
                    to: ctx.accounts.receiver_mea_spl.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[signer_seeds],
            ),
            amount_after_fee,
        )?;

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct SwapState {
    pub initialized: bool,
    pub admin: Pubkey,
    pub fee_bps: u16,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        seeds = [b"state"],
        bump,
        space = 8 + SwapState::INIT_SPACE,
    )]
    pub swap_state: Box<Account<'info, SwapState>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateState<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub swap_state: Box<Account<'info, SwapState>>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub swap_state: Box<Account<'info, SwapState>>,

    /// CHECK: Just a PDA authority, no data read or written
    #[account(
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mea_spl,
        associated_token::authority = treasury,
        associated_token::token_program = token_program,
    )]
    pub treasury_mea_spl: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mea_2022,
        associated_token::authority = treasury,
        associated_token::token_program = token_2022_program,
    )]
    pub treasury_mea_spl2022: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_spl,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub receiver_mea_spl: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_2022,
        associated_token::authority = signer,
        associated_token::token_program = token_2022_program,
    )]
    pub receiver_mea_spl2022: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = MEA_SPL_MINT @ SwapError::InvalidMint
    )]
    pub mea_spl: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        address = MEA_SPL2022_MINT @ SwapError::InvalidMint
    )]
    pub mea_2022: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub token_2022_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Add2022Reserve<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub swap_state: Box<Account<'info, SwapState>>,

    #[account(
        mut,
        associated_token::mint = mea_2022,
        associated_token::authority = signer,
        associated_token::token_program = token_2022_program,
    )]
    pub payer_mea_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Just a PDA authority, no data read or written
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_2022,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_2022_program,
    )]
    pub vault_mea_2022: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = MEA_SPL2022_MINT @ SwapError::InvalidMint
    )]
    pub mea_2022: Box<InterfaceAccount<'info, Mint>>,
    pub token_2022_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddSplReserve<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub swap_state: Box<Account<'info, SwapState>>,

    #[account(
        mut,
        associated_token::mint = mea_spl,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub payer_mea_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Just a PDA authority, no data read or written
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_spl,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_program,
    )]
    pub vault_mea_spl: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = MEA_SPL_MINT @ SwapError::InvalidMint
    )]
    pub mea_spl: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapSplToSpl2022<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub swap_state: Box<Account<'info, SwapState>>,

    #[account(
        mut,
        associated_token::mint = mea_spl,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub payer_mea_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Just a PDA authority, no data read or written
    #[account(
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_spl,
        associated_token::authority = treasury,
        associated_token::token_program = token_program,
    )]
    pub treasury_mea_spl: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Just a PDA authority, no data read or written
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_spl,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_program,
    )]
    pub vault_mea_spl: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mea_2022,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_2022_program,
    )]
    pub vault_mea_2022: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_2022,
        associated_token::authority = signer,
        associated_token::token_program = token_2022_program,
    )]
    pub receiver_mea_2022: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = MEA_SPL_MINT @ SwapError::InvalidMint
    )]
    pub mea_spl: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        address = MEA_SPL2022_MINT @ SwapError::InvalidMint
    )]
    pub mea_2022: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub token_2022_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapSpl2022ToSpl<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"state"],
        bump,
    )]
    pub swap_state: Box<Account<'info, SwapState>>,

    #[account(
        mut,
        associated_token::mint = mea_2022,
        associated_token::authority = signer,
        associated_token::token_program = token_2022_program,
    )]
    pub payer_mea_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Just a PDA authority, no data read or written
    #[account(
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_2022,
        associated_token::authority = treasury,
        associated_token::token_program = token_2022_program,
    )]
    pub treasury_mea_spl2022: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Just a PDA authority, no data read or written
    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mea_spl,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_program,
    )]
    pub vault_mea_spl: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_2022,
        associated_token::authority = vault_authority,
        associated_token::token_program = token_2022_program,
    )]
    pub vault_mea_2022: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mea_spl,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub receiver_mea_spl: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = MEA_SPL_MINT @ SwapError::InvalidMint
    )]
    pub mea_spl: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        address = MEA_SPL2022_MINT @ SwapError::InvalidMint
    )]
    pub mea_2022: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub token_2022_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum SwapError {
    #[msg("Invalid mint provided.")]
    InvalidMint,
    #[msg("Unauthorized.")]
    Unauthorized,
    #[msg("Math operation overflow.")]
    MathOverflow,
}
