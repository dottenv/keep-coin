"""family sharing and category keywords

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b6
Create Date: 2026-08-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade():
    # family_members: семейный доступ (все счета владельца)
    op.create_table('family_members',
    sa.Column('owner_id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('role', sa.String(length=10), nullable=False),
    sa.Column('invited_by', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['member_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('owner_id', 'member_id')
    )
    with op.batch_alter_table('family_members', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_family_members_owner_id'), ['owner_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_family_members_member_id'), ['member_id'], unique=False)

    # category_keywords: авто-категории по ключевым словам
    op.create_table('category_keywords',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('keyword', sa.String(length=120), nullable=False),
    sa.Column('category_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'keyword', name='uq_category_keyword')
    )
    with op.batch_alter_table('category_keywords', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_category_keywords_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_category_keywords_category_id'), ['category_id'], unique=False)

    # account_invites: делаем account_id необязательным + добавляем scope
    with op.batch_alter_table('account_invites', schema=None) as batch_op:
        batch_op.alter_column('account_id',
            existing_type=sa.Uuid(),
            nullable=True)
        batch_op.add_column(sa.Column('scope', sa.String(length=10), nullable=False, server_default='account'))

    # убираем server_default после применения (чтобы колонка оставалась NOT NULL без дефолта на уровне схемы)
    with op.batch_alter_table('account_invites', schema=None) as batch_op:
        batch_op.alter_column('scope',
            existing_type=sa.String(length=10),
            nullable=False,
            server_default=None)


def downgrade():
    with op.batch_alter_table('account_invites', schema=None) as batch_op:
        batch_op.drop_column('scope')
        batch_op.alter_column('account_id',
            existing_type=sa.Uuid(),
            nullable=False)

    with op.batch_alter_table('category_keywords', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_category_keywords_category_id'))
        batch_op.drop_index(batch_op.f('ix_category_keywords_user_id'))

    op.drop_table('category_keywords')

    with op.batch_alter_table('family_members', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_family_members_member_id'))
        batch_op.drop_index(batch_op.f('ix_family_members_owner_id'))

    op.drop_table('family_members')
