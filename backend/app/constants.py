SAMPLE_ROWS = 100
MAX_TOP_VALUES = 8
PROFILE_CHUNK_SIZE = 50_000
DEFAULT_OPENAI_MODEL = "gpt-4.1-mini"

TARGET_HINTS = (
    "target",
    "label",
    "default",
    "bad",
    "charged",
    "chargeoff",
    "charge_off",
    "loan_status",
    "status",
    "outcome",
    "response",
)

LEAKAGE_HINTS = (
    "recover",
    "recovery",
    "collection",
    "last_pymnt",
    "next_pymnt",
    "total_pymnt",
    "total_rec",
    "out_prncp",
    "settlement",
    "hardship",
    "last_credit_pull",
)

ID_HINTS = ("id", "record", "member", "account", "customer", "user")
DATE_HINTS = ("date", "_d", "dt", "month", "year", "issue", "earliest")
