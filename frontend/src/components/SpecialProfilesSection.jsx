import React from 'react';
import { Droplet, Bug, FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * SpecialProfilesSection
 * Allows Admin Officer to select special profiles during Job Creation:
 * 1. Water ISO 10500:2012 (Exclusive; clears other profiles & locks group selector)
 * 2. Food Pesticides Residues (GC-MS/MS + LC-MS/MS panels)
 * 3. Fatty Acid Profile (Compiled 4 params vs Full 37 params)
 */
export default function SpecialProfilesSection({
  specialProfiles = {
    waterIso10500: false,
    pesticides: false,
    fattyAcids: { enabled: false, variant: null },
  },
  onChange,
  disabled = false,
  onExclusivityChange,
}) {
  const isWaterExclusive = Boolean(specialProfiles?.waterIso10500);

  const handleWaterToggle = (e) => {
    const checked = e.target.checked;
    if (checked) {
      const updated = {
        waterIso10500: true,
        pesticides: false,
        fattyAcids: { enabled: false, variant: null },
      };
      onChange(updated);
      if (onExclusivityChange) onExclusivityChange(true);
    } else {
      const updated = {
        ...specialProfiles,
        waterIso10500: false,
      };
      onChange(updated);
      if (onExclusivityChange) onExclusivityChange(false);
    }
  };

  const handlePesticidesToggle = (e) => {
    const checked = e.target.checked;
    onChange({
      ...specialProfiles,
      pesticides: checked,
    });
  };

  const handleFattyAcidsToggle = (e) => {
    const checked = e.target.checked;
    onChange({
      ...specialProfiles,
      fattyAcids: {
        enabled: checked,
        // Default to 'compiled' if enabled, null if disabled
        variant: checked ? (specialProfiles?.fattyAcids?.variant || 'compiled') : null,
      },
    });
  };

  const handleFattyAcidVariantChange = (variant) => {
    onChange({
      ...specialProfiles,
      fattyAcids: {
        enabled: true,
        variant,
      },
    });
  };

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1.25rem',
        borderRadius: '8px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h4
          style={{
            margin: 0,
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--color-text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FlaskConical size={20} style={{ color: 'var(--color-primary)' }} />
          Special Profiles & Panels
        </h4>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
          }}
        >
          Select specialized compliance profiles or high-density testing panels for this sample.
        </p>
      </div>

      {/* Profile Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Card 1: Water ISO 10500:2012 (Exclusive) */}
        <label
          htmlFor="special-profile-water"
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            borderRadius: '8px',
            border: isWaterExclusive
              ? '2px solid var(--color-primary)'
              : '1px solid var(--color-border)',
            backgroundColor: isWaterExclusive
              ? 'var(--color-surface-hover)'
              : 'var(--color-surface)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: disabled ? 0.6 : 1,
            minHeight: '44px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <input
              id="special-profile-water"
              type="checkbox"
              checked={isWaterExclusive}
              disabled={disabled}
              onChange={handleWaterToggle}
              style={{
                marginTop: '0.25rem',
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: isWaterExclusive
                      ? 'var(--color-primary)'
                      : 'var(--color-text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Droplet size={16} /> Water ISO 10500:2012
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Exclusive
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.4,
                }}
              >
                Complete standard drinking water profile (102 parameters). Disables standard group selection.
              </p>
            </div>
          </div>
        </label>

        {/* Card 2: Food Pesticides Residues */}
        <label
          htmlFor="special-profile-pesticides"
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            borderRadius: '8px',
            border: specialProfiles?.pesticides
              ? '2px solid var(--color-primary)'
              : '1px solid var(--color-border)',
            backgroundColor: specialProfiles?.pesticides
              ? 'var(--color-surface-hover)'
              : 'var(--color-surface)',
            cursor: disabled || isWaterExclusive ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            opacity: disabled || isWaterExclusive ? 0.45 : 1,
            minHeight: '44px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <input
              id="special-profile-pesticides"
              type="checkbox"
              checked={Boolean(specialProfiles?.pesticides)}
              disabled={disabled || isWaterExclusive}
              onChange={handlePesticidesToggle}
              style={{
                marginTop: '0.25rem',
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: specialProfiles?.pesticides
                      ? 'var(--color-primary)'
                      : 'var(--color-text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Bug size={16} /> Food Pesticides
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(52, 152, 219, 0.12)',
                    color: 'var(--color-primary)',
                  }}
                >
                  2 Panels
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.4,
                }}
              >
                Includes GC-MS/MS (55 pesticides) and LC-MS/MS (164 pesticides) multi-residue panels.
              </p>
            </div>
          </div>
        </label>

        {/* Card 3: Fatty Acid Profile */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            borderRadius: '8px',
            border: specialProfiles?.fattyAcids?.enabled
              ? '2px solid var(--color-primary)'
              : '1px solid var(--color-border)',
            backgroundColor: specialProfiles?.fattyAcids?.enabled
              ? 'var(--color-surface-hover)'
              : 'var(--color-surface)',
            transition: 'all 0.15s ease',
            opacity: disabled || isWaterExclusive ? 0.45 : 1,
            minHeight: '44px',
          }}
        >
          <label
            htmlFor="special-profile-fatty-acids"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: disabled || isWaterExclusive ? 'not-allowed' : 'pointer',
              marginBottom: specialProfiles?.fattyAcids?.enabled ? '0.75rem' : 0,
            }}
          >
            <input
              id="special-profile-fatty-acids"
              type="checkbox"
              checked={Boolean(specialProfiles?.fattyAcids?.enabled)}
              disabled={disabled || isWaterExclusive}
              onChange={handleFattyAcidsToggle}
              style={{
                marginTop: '0.25rem',
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: specialProfiles?.fattyAcids?.enabled
                      ? 'var(--color-primary)'
                      : 'var(--color-text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <FlaskConical size={16} /> Fatty Acid Profile
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.4,
                }}
              >
                Fatty acid composition profile; select compiled or full 37 parameters below.
              </p>
            </div>
          </label>

          {/* Fatty Acid Variant Radios */}
          {specialProfiles?.fattyAcids?.enabled && !isWaterExclusive && (
            <div
              style={{
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-main)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  minHeight: '32px',
                }}
              >
                <input
                  type="radio"
                  name="fattyAcidVariant"
                  value="compiled"
                  checked={specialProfiles.fattyAcids?.variant === 'compiled'}
                  disabled={disabled}
                  onChange={() => handleFattyAcidVariantChange('compiled')}
                  style={{ cursor: 'pointer' }}
                />
                <span>
                  <strong>Compiled</strong> (4 parameters: Saturated, Mono, Poly, Trans)
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-main)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  minHeight: '32px',
                }}
              >
                <input
                  type="radio"
                  name="fattyAcidVariant"
                  value="full"
                  checked={specialProfiles.fattyAcids?.variant === 'full'}
                  disabled={disabled}
                  onChange={() => handleFattyAcidVariantChange('full')}
                  style={{ cursor: 'pointer' }}
                />
                <span>
                  <strong>Full Profile</strong> (37 parameters)
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
