"""Choose a TV and the cameras to show in Camera Wall."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.network import NoURLAvailableError, get_url
from homeassistant.helpers.selector import (
    EntitySelector,
    EntitySelectorConfig,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from .const import CONF_CAMERAS, CONF_HA_URL, CONF_MODE, CONF_TOKEN, CONF_TV, DOMAIN, MODES

URL = TextSelector(TextSelectorConfig(type=TextSelectorType.URL))
PASSWORD = TextSelector(TextSelectorConfig(type=TextSelectorType.PASSWORD))
CAMERAS = EntitySelector(EntitySelectorConfig(domain="camera", multiple=True))
MODE = SelectSelector(SelectSelectorConfig(options=MODES, translation_key="mode", mode=SelectSelectorMode.DROPDOWN))


def _tvs(hass: HomeAssistant) -> list[str]:
    return [e.entity_id for e in er.async_get(hass).entities.values()
            if e.domain == "media_player" and e.platform == "webostv"]


def _ha_url(hass: HomeAssistant) -> str:
    try:
        return get_url(hass, allow_external=False, allow_cloud=False)
    except NoURLAvailableError:
        return ""


def _options_schema() -> vol.Schema:
    return vol.Schema({
        vol.Required(CONF_HA_URL): URL,
        vol.Required(CONF_TOKEN): PASSWORD,
        vol.Optional(CONF_CAMERAS, default=[]): CAMERAS,
        vol.Required(CONF_MODE, default="mjpeg"): MODE,
    })


def _clean(values: dict[str, Any]) -> dict[str, Any]:
    result = dict(values)
    result[CONF_HA_URL] = result[CONF_HA_URL].rstrip("/")
    result[CONF_CAMERAS] = result.get(CONF_CAMERAS) or []
    return result


class CameraWallConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return CameraWallOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        tvs = _tvs(self.hass)
        if not tvs:
            return self.async_abort(reason="no_tv")
        if user_input is not None:
            tv = user_input.pop(CONF_TV)
            await self.async_set_unique_id(tv)
            self._abort_if_unique_id_configured()
            state = self.hass.states.get(tv)
            return self.async_create_entry(
                title=f"Camera Wall on {state.name if state else tv}",
                data={CONF_TV: tv}, options=_clean(user_input),
            )
        schema = vol.Schema({
            vol.Required(CONF_TV): EntitySelector(EntitySelectorConfig(include_entities=tvs))
        }).extend(_options_schema().schema)
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(schema, {CONF_HA_URL: _ha_url(self.hass)}),
        )


class CameraWallOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=_clean(user_input))
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(_options_schema(), self.config_entry.options),
        )
