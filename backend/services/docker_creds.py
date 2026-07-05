import base64
import json


def build_docker_config(
    registry: str, username: str, password: str, email: str
) -> str:
    """
    Build a base64-encoded .dockerconfigjson structure.

    This creates the proper format for `kubernetes.io/dockerconfigjson` secrets.

    Args:
        registry: Docker registry URL (e.g., "https://index.docker.io/v1/")
        username: Docker registry username
        password: Docker registry password or token
        email: Email address for the registry account

    Returns:
        Base64-encoded JSON string suitable for .dockerconfigjson data key
    """
    auth = base64.b64encode(f"{username}:{password}".encode()).decode()

    config = {"auths": {registry: {"username": username, "password": password, "email": email, "auth": auth}}}

    return base64.b64encode(json.dumps(config).encode()).decode()


def parse_docker_config(docker_config_b64: str) -> dict:
    """
    Parse a base64-encoded .dockerconfigjson structure.

    Args:
        docker_config_b64: Base64-encoded JSON string

    Returns:
        Parsed dictionary with registry credentials
    """
    decoded = base64.b64decode(docker_config_b64).decode("utf-8")
    return json.loads(decoded)


def mask_docker_config(docker_config: dict) -> dict:
    """
    Mask sensitive fields in a docker config for display.

    Args:
        docker_config: Parsed docker config dictionary

    Returns:
        Dictionary with masked password and auth fields
    """
    masked = json.loads(json.dumps(docker_config))
    for registry in masked.get("auths", {}).values():
        if "password" in registry:
            registry["password"] = "******"
        if "auth" in registry:
            registry["auth"] = "******"
    return masked
