/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  customElement,
  property,
  TemplateResult,
  CSSResult,
  state,
  unsafeCSS,
} from 'lit-element';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { FrigateCardConfig } from './types';

import frigate_card_editor_style from './frigate-hass-card-editor.scss';

const options = {
  required: {
    icon: 'cog',
    name: 'Required',
    secondary: 'Required options for this card to function',
    show: true,
  },
  optional: {
    icon: 'tune',
    name: 'Optional',
    secondary: 'Optional configuration to tweak card behavior',
    show: false,
  },
  webrtc: {
    icon: 'webrtc',
    name: 'WebRTC',
    secondary: 'Optional WebRTC parameters',
    show: false,
  },
  advanced: {
    icon: 'cogs',
    name: 'Advanced',
    secondary: 'Advanced options',
    show: false,
  },
};

@customElement('frigate-card-editor')
export class FrigateCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: FrigateCardConfig;
  @state() private _toggle?: boolean;
  @state() private _helpers?: any;
  private _initialized = false;

  public setConfig(config: FrigateCardConfig): void {
    this._config = config;
    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  protected _getEntities(domain: string): string[] {
    if (!this.hass) {
      return [];
    }
    const entities = Object.keys(this.hass.states).filter(
      (eid) => eid.substr(0, eid.indexOf('.')) === domain,
    );
    entities.sort();

    // Add a blank entry to unset a selection.
    entities.unshift('');
    return entities;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers) {
      return html``;
    }

    // The climate more-info has ha-switch and paper-dropdown-menu elements that are lazy loaded unless explicitly done here
    this._helpers.importMoreInfoControl('climate');

    // You can restrict on domain type
    const cameraEntities = this._getEntities('camera');
    const binarySensorEntities = this._getEntities('binary_sensor');

    const webrtcCameraEntity =
      this._config?.webrtc && (this._config?.webrtc as any).entity
        ? (this._config?.webrtc as any).entity
        : '';

    const viewModes = {
      '': '',
      live: 'Live view',
      clips: 'Clip gallery',
      snapshots: 'Snapshot gallery',
      clip: 'Latest clip',
      snapshot: 'Latest snapshot',
    };

    const menuModes = {
      '': '',
      hidden: 'Hidden',
      overlay: 'Overlay',
      above: 'Above',
      below: 'Below',
    };

    const liveProvider = {
      '': '',
      frigate: 'Frigate',
      webrtc: 'WebRTC',
    };

    return html`
      <div class="card-config">
        <div class="option" @click=${this._toggleOption} .option=${'required'}>
          <div class="row">
            <ha-icon .icon=${`mdi:${options.required.icon}`}></ha-icon>
            <div class="title">${options.required.name}</div>
          </div>
          <div class="secondary">${options.required.secondary}</div>
        </div>
        ${options.required.show
          ? html`
              <div class="values">
                <paper-dropdown-menu
                  label="Camera Entity (Required)"
                  @value-changed=${this._valueChanged}
                  .configValue=${'camera_entity'}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected=${cameraEntities.indexOf(
                      this._config?.camera_entity || '',
                    )}
                  >
                    ${cameraEntities.map((entity) => {
                      return html` <paper-item>${entity}</paper-item> `;
                    })}
                  </paper-listbox>
                </paper-dropdown-menu>
              </div>
            `
          : ''}
        <div class="option" @click=${this._toggleOption} .option=${'optional'}>
          <div class="row">
            <ha-icon .icon=${`mdi:${options.optional.icon}`}></ha-icon>
            <div class="title">${options.optional.name}</div>
          </div>
          <div class="secondary">${options.optional.secondary}</div>
        </div>
        ${options.optional.show
          ? html` <div class="values">
              <paper-dropdown-menu
                label="Motion Entity (Optional)"
                @value-changed=${this._valueChanged}
                .configValue=${'motion_entity'}
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected=${binarySensorEntities.indexOf(
                    this._config?.motion_entity || '',
                  )}
                >
                  ${binarySensorEntities.map((entity) => {
                    return html` <paper-item>${entity}</paper-item> `;
                  })}
                </paper-listbox>
              </paper-dropdown-menu>
              <paper-input
                label="Frigate camera name (Optional)"
                .value=${this._config?.frigate_camera_name || ''}
                .configValue=${'frigate_camera_name'}
                @value-changed=${this._valueChanged}
              ></paper-input>
              <paper-dropdown-menu
                label="Default view (Optional)"
                @value-changed=${this._valueChanged}
                .configValue=${'view_default'}
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected=${Object.keys(viewModes).indexOf(
                    this._config?.view_default || '',
                  )}
                >
                  ${Object.keys(viewModes).map((key) => {
                    return html`
                      <paper-item .label="${key}"> ${viewModes[key]} </paper-item>
                    `;
                  })}
                </paper-listbox>
              </paper-dropdown-menu>
              <paper-dropdown-menu
                label="Menu mode (Optional)"
                @value-changed=${this._valueChanged}
                .configValue=${'menu_mode'}
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected=${Object.keys(menuModes).indexOf(
                    this._config?.menu_mode || '',
                  )}
                >
                  ${Object.keys(menuModes).map((key) => {
                    return html`
                      <paper-item .label="${key}"> ${menuModes[key]} </paper-item>
                    `;
                  })}
                </paper-listbox>
              </paper-dropdown-menu>
              <paper-input
                  label="Frigate client id (Optional, for >1 Frigate server)"
                  .value=${this._config?.frigate_client_id || ''}
                  .configValue=${'frigate_client_id'}
                  @value-changed=${this._valueChanged}
              ></paper-input>
              <paper-input
                label="View timeout (seconds)"
                prevent-invalid-input
                allowed-pattern="[0-9]"
                .value=${this._config?.view_timeout
                  ? String(this._config.view_timeout)
                  : ''}
                .configValue=${'view_timeout'}
                @value-changed=${this._valueChanged}
              ></paper-input>
              <paper-input
                  label="Frigate URL (Optional, for Frigate UI button)"
                  .value=${this._config?.frigate_url || ''}
                  .configValue=${'frigate_url'}
                  @value-changed=${this._valueChanged}
              ></paper-input>
              <ha-formfield .label=${`Autoplay latest clip`}>
                <ha-switch
                  .checked=${this._config?.autoplay_clip === true}
                  .configValue=${'autoplay_clip'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
            </div>`
          : ''}
        <div class="option" @click=${this._toggleOption} .option=${'advanced'}>
          <div class="row">
            <ha-icon .icon=${`mdi:${options.advanced.icon}`}></ha-icon>
            <div class="title">${options.advanced.name}</div>
          </div>
          <div class="secondary">${options.advanced.secondary}</div>
        </div>
        ${options.advanced.show
          ? html` <div class="values">
                <paper-input
                  label="Frigate zone filter (Optional)"
                  .value=${this._config?.zone || ''}
                  .configValue=${'zone'}
                  @value-changed=${this._valueChanged}
                ></paper-input>
              </div>
              <div class="values">
                <paper-input
                  label="Frigate label/object filter (Optional)"
                  .value=${this._config?.label || ''}
                  .configValue=${'label'}
                  @value-changed=${this._valueChanged}
                ></paper-input>
              </div>`
          : ''}
        <div class="option" @click=${this._toggleOption} .option=${'webrtc'}>
          <div class="row">
            <ha-icon .icon=${`mdi:${options.webrtc.icon}`}></ha-icon>
            <div class="title">${options.webrtc.name}</div>
          </div>
          <div class="secondary">${options.webrtc.secondary}</div>
        </div>
        ${options.webrtc.show
          ? html` <div class="values">
              <paper-dropdown-menu
                label="WebRTC/Frigate Live provider (Optional)"
                @value-changed=${this._valueChanged}
                .configValue=${'live_provider'}
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected=${Object.keys(liveProvider).indexOf(
                    this._config?.live_provider || '',
                  )}
                >
                  ${Object.keys(liveProvider).map((key) => {
                    return html`
                      <paper-item .label="${key}">${liveProvider[key]} </paper-item>
                    `;
                  })}
                </paper-listbox>
              </paper-dropdown-menu>
              <paper-dropdown-menu
                label="WebRTC Camera Entity (To use with WebRTC Live Provider)"
                @value-changed=${this._valueChanged}
                .configValue=${'webrtc.entity'}
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected=${cameraEntities.indexOf(webrtcCameraEntity)}
                >
                  ${cameraEntities.map((entity) => {
                    return html` <paper-item>${entity}</paper-item> `;
                  })}
                </paper-listbox>
              </paper-dropdown-menu>
            </div>`
          : ''}
      </div>
    `;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  private _toggleOption(ev): void {
    this._toggleThing(ev, options);
  }

  private _toggleThing(ev, optionList): void {
    const show = !optionList[ev.target.option].show;
    for (const [key] of Object.entries(optionList)) {
      optionList[key].show = false;
    }
    optionList[ev.target.option].show = show;
    this._toggle = !this._toggle;
  }

  private _valueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const value = target.value?.trim();
    let key: string = target.configValue;

    if (!key) {
      return;
    }

    // Need to deep copy the config so cannot use Object.assign.
    const newConfig = JSON.parse(JSON.stringify(this._config));
    let objectTarget = newConfig;

    if (key.includes('.')) {
      const parts = key.split('.', 2);
      const configName = parts[0];
      if (!(configName in newConfig)) {
        newConfig[configName] = {};
      }
      objectTarget = newConfig[configName];
      key = parts[1];
    }

    if (value !== undefined && objectTarget[key] === value) {
      return;
    } else if (value === '') {
      delete objectTarget[key];
    } else {
      objectTarget[key] = target.checked !== undefined ? target.checked : value;
    }
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  // Return compiled CSS styles (thus safe to use with unsafeCSS).
  static get styles(): CSSResult {
    return unsafeCSS(frigate_card_editor_style);
  }
}
