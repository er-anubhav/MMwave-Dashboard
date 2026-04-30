"""initial tenant schema

Revision ID: 20260430_0001
Revises:
Create Date: 2026-04-30
"""

from typing import Sequence, Union

from alembic import op

import database


revision: str = "20260430_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    database.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    database.metadata.drop_all(bind=op.get_bind())
