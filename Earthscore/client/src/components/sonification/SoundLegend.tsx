import { DEFAULT_TEMPERATURE_MAPPING } from "../../config/audioMapping";
import { temperatureToSound } from "../../audio/temperatureMapping";

import type {
  TemperatureMappingConfig,
  TemperatureSound,
} from "../../types/audio";

interface SoundLegendProps {
  // Use the same configuration as the audio engine.
  mapping?: TemperatureMappingConfig;

  // Optional result for the currently selected observation.
  currentSound?: TemperatureSound;

  // The parent owns audio initialization and error handling.
  onPreview?: (temperatureC: number) => void;
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

export default function SoundLegend({
  mapping = DEFAULT_TEMPERATURE_MAPPING,
  currentSound,
  onPreview,
  onStopPreview,
  previewDisabled = false,
  className,
}: SoundLegendProps) {
  const midpoint =
    mapping.minTemperatureC +
    (mapping.maxTemperatureC - mapping.minTemperatureC) / 2;

  const samples = [
    {
      label: "Lower mapping limit",
      temperatureC: mapping.minTemperatureC,
    },
    {
      label: "Mapping midpoint",
      temperatureC: midpoint,
    },
    {
      label: "Upper mapping limit",
      temperatureC: mapping.maxTemperatureC,
    },
  ];

  return (
    <section className={className} aria-label="Temperature sound guide">
      <h2>What do the sounds mean?</h2>

      <p>
        Lower temperatures produce lower-pitched tones. Higher
        temperatures produce higher-pitched tones.
      </p>

      <p>
        Temperature controls pitch. The volume control changes listening
        loudness independently.
      </p>

      <table>
        <caption>Reference temperatures and their sound frequencies</caption>

        <thead>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">Temperature</th>
            <th scope="col">Frequency</th>
            {onPreview && <th scope="col">Listen</th>}
          </tr>
        </thead>

        <tbody>
          {samples.map((sample) => {
            const sound = temperatureToSound(
              sample.temperatureC,
              mapping,
            );

            const temperatureLabel =
              `${formatNumber(sample.temperatureC)} °C`;

            const frequencyLabel =
              sound.frequencyHz === null
                ? "No tone"
                : `${formatNumber(sound.frequencyHz)} Hz`;

            return (
              <tr key={sample.label}>
                <th scope="row">{sample.label}</th>
                <td>{temperatureLabel}</td>
                <td>{frequencyLabel}</td>

                {onPreview && (
                  <td>
                    <button
                      type="button"
                      disabled={previewDisabled}
                      aria-label={
                        `Listen to ${temperatureLabel}, ${frequencyLabel}`
                      }
                      onClick={() => onPreview(sample.temperatureC)}
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
        Missing observations produce no tone. Temperatures outside the
        mapping range use the nearest endpoint pitch; their original
        values remain available.
      </p>

      <p>
        These are reference points for the sound mapping, not thresholds
        for environmental danger or unusual conditions.
      </p>

      {currentSound !== undefined && (
        <div>
          <h3>Selected observation</h3>

          {currentSound.originalTemperatureC === null ? (
            <p>No temperature observation is available. No tone is played.</p>
          ) : (
            <>
              <dl>
                <dt>Temperature</dt>
                <dd>
                  {formatNumber(currentSound.originalTemperatureC)} °C
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
                  This temperature is outside the configured sound range.
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