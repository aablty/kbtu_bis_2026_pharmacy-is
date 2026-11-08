"""store medicine dosage forms as a stable enum key

Revision ID: f2a7c9d4e1b3
Revises: a1c4f0e7b9d2
"""

from collections.abc import Sequence

from alembic import op

revision: str = "f2a7c9d4e1b3"
down_revision: str | Sequence[str] | None = "a1c4f0e7b9d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_VALUES = (
    "ampoules, aerosol, balm, gel, granules, dragee, chewing_gum, drops, "
    "capsules, vaginal_capsules, pencil, concentrate, cream, lacquer, lozenges, "
    "lotion, ointment, oil, tincture, paste, pastilles, strip, patch, "
    "dispersible_film, powder, solution, sachet, syrup, spiral, spray, "
    "suppositories, suspension, tablets, vaginal_tablets, vial, shampoo, "
    "effervescent_tablets, syringe, emulsion"
)


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE dosage_form AS ENUM ({', '.join(repr(value.strip()) for value in _VALUES.split(','))})"
    )
    op.execute(
        """
        UPDATE medicines
        SET dosage_form = CASE dosage_form
            WHEN 'ампулы' THEN 'ampoules'
            WHEN 'аэрозоль' THEN 'aerosol'
            WHEN 'бальзам' THEN 'balm'
            WHEN 'гель' THEN 'gel'
            WHEN 'гранулы' THEN 'granules'
            WHEN 'драже' THEN 'dragee'
            WHEN 'жевательная резинка' THEN 'chewing_gum'
            WHEN 'капли' THEN 'drops'
            WHEN 'капсулы' THEN 'capsules'
            WHEN 'капсулы вагинальные' THEN 'vaginal_capsules'
            WHEN 'карандаш' THEN 'pencil'
            WHEN 'концентрат' THEN 'concentrate'
            WHEN 'крем' THEN 'cream'
            WHEN 'лак' THEN 'lacquer'
            WHEN 'леденцы' THEN 'lozenges'
            WHEN 'лосьон' THEN 'lotion'
            WHEN 'мазь' THEN 'ointment'
            WHEN 'масло' THEN 'oil'
            WHEN 'настойка' THEN 'tincture'
            WHEN 'паста' THEN 'paste'
            WHEN 'пастилки' THEN 'pastilles'
            WHEN 'пластинка' THEN 'strip'
            WHEN 'пластырь' THEN 'patch'
            WHEN 'пленка диспергируемая' THEN 'dispersible_film'
            WHEN 'порошок' THEN 'powder'
            WHEN 'раствор' THEN 'solution'
            WHEN 'саше' THEN 'sachet'
            WHEN 'сироп' THEN 'syrup'
            WHEN 'спираль' THEN 'spiral'
            WHEN 'спрей' THEN 'spray'
            WHEN 'суппозитории' THEN 'suppositories'
            WHEN 'суспензия' THEN 'suspension'
            WHEN 'таблетки' THEN 'tablets'
            WHEN 'таблетки вагинальные' THEN 'vaginal_tablets'
            WHEN 'флакон' THEN 'vial'
            WHEN 'шампунь' THEN 'shampoo'
            WHEN 'шипучие таблетки' THEN 'effervescent_tablets'
            WHEN 'шприц' THEN 'syringe'
            WHEN 'эмульсия' THEN 'emulsion'
            ELSE NULL
        END
        WHERE dosage_form IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE medicines ALTER COLUMN dosage_form TYPE dosage_form "
        "USING dosage_form::dosage_form"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE medicines ALTER COLUMN dosage_form TYPE varchar(50) "
        "USING dosage_form::text"
    )
    op.execute("DROP TYPE dosage_form")
