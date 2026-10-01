"""drop paypal and pesapal from provider enum

Revision ID: ba47ab8e17d0
Revises: c1b12a7da6b1
Create Date: 2026-10-01 17:03:19.733798

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba47ab8e17d0'
down_revision: Union[str, Sequence[str], None] = 'c1b12a7da6b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Postgres has no ALTER TYPE ... DROP VALUE, so swap in a new enum type.
    op.execute("ALTER TYPE provider RENAME TO provider_old")
    op.execute("CREATE TYPE provider AS ENUM ('MPESA', 'STRIPE')")
    op.execute(
        "ALTER TABLE transactions ALTER COLUMN provider TYPE provider "
        "USING provider::text::provider"
    )
    op.execute("DROP TYPE provider_old")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TYPE provider RENAME TO provider_new")
    op.execute("CREATE TYPE provider AS ENUM ('MPESA', 'PAYPAL', 'STRIPE', 'PESAPAL')")
    op.execute(
        "ALTER TABLE transactions ALTER COLUMN provider TYPE provider "
        "USING provider::text::provider"
    )
    op.execute("DROP TYPE provider_new")
