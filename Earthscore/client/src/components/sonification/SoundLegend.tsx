import { temperatureToSound } from "../../audio/temperatureMapping";
import {
  SOUND_PARAMETERS,
  type SoundParameter,
} from "../../config/parameters";

import type { TemperatureSound } from "../../types/audio";

interface SoundLegendProps {
  // Which parameter is being sonified (default: temperature).
  parameter?: SoundParameter;

  // Optional result for the currently selected observation.
  currentSound?: TemperatureSound;

  // The parent owns audio initialization and error handling.
  onPreview?: (value: number) => void;
  onStopPreview?: () => void;

  // Disable preview controls while audio is initializing.
  previewDisabled?: boolean;

  // Let the frontend teammate apply existing styles.
  className?: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

/**
 * Explains the value-to-pitch mapping of the selected parameter and lets
 * the listener hear its lowest, middle and highest reference tones.
 */
export default function SoundLegend({
  parameter = SOUND_PARAMETERS.temperature,
  currentSound,
  onPreview,
  onStopPreview,
  previewDisabled = false,
  className,
}: SoundLegendProps) {
  const mapping = parameter.mapping;
  const unit = parameter.unit;

  const low = mapping.minTemperatureC;
  const high = mapping.maxTemperatureC;
  const midpoint = low + (high - low) / 2;

  const samples = [
    { label: "Lower mapping limit", value: low },
    { label: "Mapping midpoint", value: midpoint },
    { label: "Upper mapping limit", value: high },
  ];

  return (
    <section className={className} aria-label={`${parameter.label} sound guide`}>
      <h2>What do the sounds mean?</h2>

      <p>
        {parameter.label}: lower values ({parameter.lowWord}) produce
        lower-pitched tones; higher values ({parameter.highWord}) produce
        higher-pitched tones.
      </p>

      <p>
        The value controls pitch. The volume control changes listening
        loudness independently.
      </p>

      <table>
        <caption>
          Reference {parameter.quantity} values and their sound frequencies
          (mapping {mapping.id})
        </caption>

        <thead>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">{parameter.label}</th>
            <th scope="col">Frequency</th>
            {onPreview && <th scope="col">Listen</th>}
          </tr>
        </thead>

        <tbody>
          {samples.map((sample) => {
            const sound = temperatureToSound(sample.value, mapping);

            const valueLabel = `${formatNumber(sample.value)} ${unit}`;

            const frequencyLabel =
              sound.frequencyHz === null
                ? "No tone"
                : `${formatNumber(sound.frequencyHz)} Hz`;

            return (
              <tr key={sample.label}>
                <th scope="row">{sample.label}</th>
                <td>{valueLabel}</td>
                <td>{frequencyLabel}</td>

                {onPreview && (
                  <td>
                    <button
                      type="button"
                      disabled={previewDisabled}
                      aria-label={`Listen to ${valueLabel}, ${frequencyLabel}`}
                      onClick={() => onPreview(sample.value)}
                    >
                      Listen
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {onPreview && onStopPreview && (
        <button type="button" onClick={onStopPreview}>
          Stop preview
        </button>
      )}

      <p>
        Missing observations produce no tone. Values outside the mapping
        range use the nearest endpoint pitch; their original values remain
        available.
      </p>

      <p>
        These are reference points for the sound mapping, not thresholds
        for environmental danger or unusual conditions.
      </p>

      {currentSound !== undefined && (
        <div>
          <h3>Selected observation</h3>

          {currentSound.originalTemperatureC === null ? (
            <p>No observation is available for this month. No tone is played.</p>
          ) : (
            <>
              <dl>
                <dt>{parameter.label}</dt>
                <dd>
                  {formatNumber(currentSound.originalTemperatureC)} {unit}
                </dd>

                <dt>Mapped frequency</dt>
                <dd>
                  {currentSound.frequencyHz === null
                    ? "No tone"
                    : `${formatNumber(currentSound.frequencyHz)} Hz`}
                </dd>
              </dl>

              {currentSound.clipped && (
                <p>
                  This value is outside the configured sound range.
                  The pitch is limited to the nearest endpoint.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
