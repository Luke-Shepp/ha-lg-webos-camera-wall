"""Buttons to pair and open Camera Wall."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .controller import CameraWallController


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    controller = entry.runtime_data
    async_add_entities([
        CameraWallButton(controller, "send_setup", "Send setup to TV", controller.async_send_setup, EntityCategory.CONFIG),
        CameraWallButton(controller, "open", "Open Camera Wall", controller.async_open, None),
    ])


class CameraWallButton(ButtonEntity):
    def __init__(self, controller: CameraWallController, key: str, name: str, action, category) -> None:
        self._attr_unique_id = f"{controller.entry.entry_id}_{key}"
        self._attr_name = name
        self._attr_entity_category = category
        self._attr_has_entity_name = True
        self._attr_device_info = {
            "identifiers": {("lg_webos_camera_wall", controller.entry.entry_id)},
            "name": controller.entry.title,
            "manufacturer": "LG webOS Camera Wall",
        }
        self._action = action

    async def async_press(self) -> None:
        await self._action()
