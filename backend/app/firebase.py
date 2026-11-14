import os

import firebase_admin
from firebase_admin import credentials


def init_firebase() -> bool:
    """Connect Admin SDK when a project id and credentials or emulators exist."""
    if firebase_admin._apps:
        return True

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    if not project_id:
        return False

    options = {"projectId": project_id}
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    using_emulator = bool(
        os.getenv("FIRESTORE_EMULATOR_HOST")
        or os.getenv("FIREBASE_AUTH_EMULATOR_HOST")
        or os.getenv("FIREBASE_STORAGE_EMULATOR_HOST")
    )

    if cred_path:
        firebase_admin.initialize_app(credentials.Certificate(cred_path), options)
        return True

    if using_emulator:
        firebase_admin.initialize_app(options=options)
        return True

    return False
