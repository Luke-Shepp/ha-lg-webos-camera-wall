"""Launch and configure Camera Wall through HA's LG webOS integration."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID, STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import APP_ID, CONF_CAMERAS, CONF_HA_URL, CONF_MODE, CONF_TOKEN, CONF_TV


class CameraWallController:
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry

    async def _launch(self, params: dict[str, Any]) -> None:
        tv = self.entry.data[CONF_TV]
        state = self.hass.states.get(tv)
        if state is None or state.state != STATE_ON:
            raise HomeAssistantError(f"{tv} is off")
        if not self.hass.services.has_service("webostv", "command"):
            raise HomeAssistantError("The LG webOS TV integration is not set up")
        await self.hass.services.async_call(
            "webostv", "command",
            {ATTR_ENTITY_ID: tv, "command": "system.launcher/launch",
             "payload": {"id": APP_ID, "params": params}},
            blocking=True,
        )

    async def async_send_setup(self) -> None:
        opts = self.entry.options
        await self._launch({
            "connect": {"url": opts[CONF_HA_URL], "token": opts[CONF_TOKEN]},
            "cameras": opts.get(CONF_CAMERAS) or [],
            "mode": opts.get(CONF_MODE, "mjpeg"),
        })

    async def async_open(self) -> None:
        opts = self.entry.options
        await self._launch({
            "cameras": opts.get(CONF_CAMERAS) or [],
            "mode": opts.get(CONF_MODE, "mjpeg"),
        })
