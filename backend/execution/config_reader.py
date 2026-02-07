"""
Config Reader Module

Reads OpenClaw configuration from Google Sheets.
Caches locally to reduce API calls.

Config is stored in the 'config' tab with columns:
- key: CONFIG_KEY
- value: configuration value (string or JSON)
- scope: global, agent:{id}, skill:{name}
- updated_at: timestamp
- updated_by: who changed it
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from google.auth import default
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

credentials, _ = default()


class ConfigCache:
    """Simple in-memory cache with TTL."""

    def __init__(self, ttl_seconds=300):
        self.ttl_seconds = ttl_seconds
        self.data = {}
        self.loaded_at = None

    def is_valid(self):
        """Check if cache is still valid."""
        if not self.loaded_at:
            return False
        return datetime.utcnow() - self.loaded_at < timedelta(seconds=self.ttl_seconds)

    def set(self, data):
        """Set cache data."""
        self.data = data
        self.loaded_at = datetime.utcnow()

    def get(self):
        """Get cache data if valid."""
        if self.is_valid():
            return self.data
        return None

    def invalidate(self):
        """Force refresh on next read."""
        self.loaded_at = None


class ConfigReader:
    """Read configuration from Google Sheets 'config' tab."""

    def __init__(self, sheet_id: str, cache_ttl_seconds: int = 300):
        self.sheet_id = sheet_id
        self.cache = ConfigCache(ttl_seconds=cache_ttl_seconds)
        self.sheets = build("sheets", "v4", credentials=credentials)

    def get(
        self,
        key: str,
        scope: str = "global",
        agent_id: Optional[str] = None,
        default_value: Optional[str] = None,
    ) -> str:
        """
        Get a configuration value.

        Args:
            key: Configuration key (e.g., "triage.urgency_keywords")
            scope: Scope level ("global", "agent:{id}", "skill:{name}")
            agent_id: Agent ID if using agent-scoped config
            default_value: Default if not found

        Returns:
            Configuration value as string (caller must parse JSON if needed)
        """
        if agent_id and scope == "agent":
            scope = f"agent:{agent_id}"

        config = self._load_config()
        if not config:
            logger.warning(f"Failed to load config, using default for {key}")
            return default_value or ""

        # Search for exact match: key + scope
        for row in config:
            if row.get("key") == key and row.get("scope") == scope:
                return row.get("value", "")

        # Fallback to global scope if agent/skill scope not found
        if scope.startswith("agent:") or scope.startswith("skill:"):
            for row in config:
                if row.get("key") == key and row.get("scope") == "global":
                    return row.get("value", "")

        logger.warning(f"Config key not found: {key}/{scope}, using default")
        return default_value or ""

    def get_json(
        self,
        key: str,
        scope: str = "global",
        agent_id: Optional[str] = None,
        default_value: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Get a configuration value and parse as JSON.

        Args:
            key: Configuration key
            scope: Scope level
            agent_id: Agent ID
            default_value: Default dict if not found

        Returns:
            Parsed JSON object
        """
        value = self.get(key, scope, agent_id)
        if not value:
            return default_value or {}

        try:
            return json.loads(value)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON for config {key}: {value}")
            return default_value or {}

    def get_list(
        self,
        key: str,
        scope: str = "global",
        agent_id: Optional[str] = None,
        delimiter: str = ",",
        default_value: Optional[list] = None,
    ) -> list:
        """
        Get a configuration value and split by delimiter.

        Args:
            key: Configuration key
            scope: Scope level
            agent_id: Agent ID
            delimiter: Character to split on
            default_value: Default list if not found

        Returns:
            List of values
        """
        value = self.get(key, scope, agent_id)
        if not value:
            return default_value or []

        return [v.strip() for v in value.split(delimiter)]

    def get_int(
        self,
        key: str,
        scope: str = "global",
        agent_id: Optional[str] = None,
        default_value: Optional[int] = None,
    ) -> int:
        """Get configuration value as integer."""
        value = self.get(key, scope, agent_id)
        if not value:
            return default_value or 0

        try:
            return int(value)
        except ValueError:
            logger.error(f"Failed to parse int for config {key}: {value}")
            return default_value or 0

    def get_float(
        self,
        key: str,
        scope: str = "global",
        agent_id: Optional[str] = None,
        default_value: Optional[float] = None,
    ) -> float:
        """Get configuration value as float."""
        value = self.get(key, scope, agent_id)
        if not value:
            return default_value or 0.0

        try:
            return float(value)
        except ValueError:
            logger.error(f"Failed to parse float for config {key}: {value}")
            return default_value or 0.0

    def get_bool(
        self,
        key: str,
        scope: str = "global",
        agent_id: Optional[str] = None,
        default_value: bool = False,
    ) -> bool:
        """Get configuration value as boolean."""
        value = self.get(key, scope, agent_id)
        if not value:
            return default_value

        return value.lower() in ("true", "yes", "1", "on")

    def refresh(self):
        """Force refresh config from Sheets (bypass cache)."""
        self.cache.invalidate()

    def _load_config(self) -> Optional[list]:
        """
        Load config from Sheets and parse into list of dicts.

        Returns: List of config row dicts, or None on error
        """
        # Check cache first
        cached = self.cache.get()
        if cached is not None:
            logger.debug("Using cached config")
            return cached

        try:
            logger.debug("Fetching config from Sheets")
            result = (
                self.sheets.spreadsheets()
                .values()
                .get(spreadsheetId=self.sheet_id, range="config!A:E")
                .execute()
            )

            rows = result.get("values", [])
            if not rows:
                logger.warning("Config sheet is empty")
                return []

            # Parse into dicts
            headers = rows[0]
            config = []
            for row in rows[1:]:
                if len(row) < len(headers):
                    row = row + [""] * (len(headers) - len(row))
                config.append(dict(zip(headers, row)))

            self.cache.set(config)
            logger.info(f"Loaded {len(config)} config items")
            return config

        except Exception as e:
            logger.error(f"Failed to load config from Sheets: {e}")
            return None


# Example usage in agents:
if __name__ == "__main__":
    import os

    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    reader = ConfigReader(sheet_id)

    # Read various config types
    urgency_keywords = reader.get_list("triage.urgency_keywords")
    max_tasks = reader.get_int("triage.max_concurrent_tasks", default_value=5)
    timezone = reader.get("agent.triage.timezone", default_value="UTC")
    interaction_weights = reader.get_json("contact.interaction_weight")

    print(f"Urgency keywords: {urgency_keywords}")
    print(f"Max tasks: {max_tasks}")
    print(f"Timezone: {timezone}")
    print(f"Interaction weights: {interaction_weights}")
