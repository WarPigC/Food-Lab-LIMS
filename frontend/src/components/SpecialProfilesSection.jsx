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
  hideWaterIso = false,
  disabledProfiles = {},
  disabledReason = '',
  idPrefix = 'default',
  title = 'Special Profiles & Panels',
}) {
  const isWaterExclusive = Boolean(specialProfiles?.waterIso10500);

  const isPesticidesDisabled =
    disabled ||
    isWaterExclusive ||
    Boolean(disabledProfiles?.pesticides);

  const isFattyAcidsDisabled =
    disabled ||
    isWaterExclusive ||
    Boolean(disabledProfiles?.fattyAcids);

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
        marginBottom: '1rem',
        padding: '0.25rem 0',
      }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <h4
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FlaskConical size={18} style={{ color: 'var(--color-primary)' }} />
          {title}
        </h4>
        <p
          style={{
            margin: '0.2rem 0 0',
            fontSize: '0.82rem',
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
          gap: '0.85rem',
          alignItems: 'start',
        }}
      >
        {/* Card 1: Water ISO 10500:2012 (Exclusive, hidden in hybrid mode) */}
        {!hideWaterIso && (
          <label
            htmlFor={`special-profile-water-${idPrefix}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '0.9rem 1rem',
              borderRadius: '8px',
              border: isWaterExclusive
                ? '2px solid var(--color-primary)'
                : '2px solid var(--color-border)',
              backgroundColor: isWaterExclusive
                ? 'rgba(44, 62, 80, 0.04)'
                : 'var(--color-surface)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
              boxShadow: isWaterExclusive ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
              position: 'relative',
              opacity: disabled ? 0.6 : 1,
              boxSizing: 'border-box',
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
                id={`special-profile-water-${idPrefix}`}
                type="checkbox"
                checked={isWaterExclusive}
                disabled={disabled}
                onChange={handleWaterToggle}
                style={{
                  marginTop: '0.2rem',
                  width: '18px',
                  height: '18px',
                  minWidth: '18px',
                  maxWidth: '18px',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
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
                      fontSize: '0.92rem',
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
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      flexShrink: 0,
                    }}
                  >
                    Exclusive
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.35,
                  }}
                >
                  Complete standard drinking water profile (102 parameters). Disables standard group selection.
                </p>
              </div>
            </div>
          </label>
        )}

        {/* Card 2: Food Pesticides Residues */}
        <label
          htmlFor={`special-profile-pesticides-${idPrefix}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0.9rem 1rem',
            borderRadius: '8px',
            border: specialProfiles?.pesticides
              ? '2px solid var(--color-primary)'
              : '2px solid var(--color-border)',
            backgroundColor: specialProfiles?.pesticides
              ? 'rgba(44, 62, 80, 0.04)'
              : 'var(--color-surface)',
            cursor: isPesticidesDisabled ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
            boxShadow: specialProfiles?.pesticides ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
            opacity: isPesticidesDisabled ? 0.45 : 1,
            boxSizing: 'border-box',
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
              id={`special-profile-pesticides-${idPrefix}`}
              type="checkbox"
              checked={Boolean(specialProfiles?.pesticides)}
              disabled={isPesticidesDisabled}
              onChange={handlePesticidesToggle}
              style={{
                marginTop: '0.2rem',
                width: '18px',
                height: '18px',
                minWidth: '18px',
                maxWidth: '18px',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
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
                    fontSize: '0.92rem',
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
                {disabledProfiles?.pesticides ? (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(230, 126, 34, 0.12)',
                      color: '#d35400',
                      flexShrink: 0,
                    }}
                  >
                    {disabledReason || 'Selected on other side'}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(52, 152, 219, 0.12)',
                      color: 'var(--color-primary)',
                      flexShrink: 0,
                    }}
                  >
                    2 Panels
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.35,
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
            padding: '0.9rem 1rem',
            borderRadius: '8px',
            border: specialProfiles?.fattyAcids?.enabled
              ? '2px solid var(--color-primary)'
              : '2px solid var(--color-border)',
            backgroundColor: specialProfiles?.fattyAcids?.enabled
              ? 'rgba(44, 62, 80, 0.04)'
              : 'var(--color-surface)',
            transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
            boxShadow: specialProfiles?.fattyAcids?.enabled ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
            opacity: isFattyAcidsDisabled ? 0.45 : 1,
            boxSizing: 'border-box',
          }}
        >
          <label
            htmlFor={`special-profile-fatty-acids-${idPrefix}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: isFattyAcidsDisabled ? 'not-allowed' : 'pointer',
              marginBottom: 0,
            }}
          >
            <input
              id={`special-profile-fatty-acids-${idPrefix}`}
              type="checkbox"
              checked={Boolean(specialProfiles?.fattyAcids?.enabled)}
              disabled={isFattyAcidsDisabled}
              onChange={handleFattyAcidsToggle}
              style={{
                marginTop: '0.2rem',
                width: '18px',
                height: '18px',
                minWidth: '18px',
                maxWidth: '18px',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
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
                    fontSize: '0.92rem',
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
                {disabledProfiles?.fattyAcids && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(230, 126, 34, 0.12)',
                      color: '#d35400',
                      flexShrink: 0,
                    }}
                  >
                    {disabledReason || 'Selected on other side'}
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.35,
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
                marginTop: '0.75rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-main)',
                  cursor: disabled || isFattyAcidsDisabled ? 'not-allowed' : 'pointer',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor:
                    specialProfiles.fattyAcids?.variant === 'compiled'
                      ? 'rgba(52, 152, 219, 0.08)'
                      : 'transparent',
                  transition: 'background-color 0.15s ease',
                  margin: 0,
                }}
              >
                <input
                  type="radio"
                  name={`fattyAcidVariant-${idPrefix}`}
                  value="compiled"
                  checked={specialProfiles.fattyAcids?.variant === 'compiled'}
                  disabled={disabled || isFattyAcidsDisabled}
                  onChange={() => handleFattyAcidVariantChange('compiled')}
                  style={{
                    width: '16px',
                    height: '16px',
                    minWidth: '16px',
                    maxWidth: '16px',
                    flexShrink: 0,
                    margin: '0.15rem 0 0 0',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                />
                <span style={{ lineHeight: 1.35 }}>
                  <strong>Compiled</strong> (4 parameters: Saturated, Mono, Poly, Trans)
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  fontSize: '0.82rem',
                  color: 'var(--color-text-main)',
                  cursor: disabled || isFattyAcidsDisabled ? 'not-allowed' : 'pointer',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor:
                    specialProfiles.fattyAcids?.variant === 'full'
                      ? 'rgba(52, 152, 219, 0.08)'
                      : 'transparent',
                  transition: 'background-color 0.15s ease',
                  margin: 0,
                }}
              >
                <input
                  type="radio"
                  name={`fattyAcidVariant-${idPrefix}`}
                  value="full"
                  checked={specialProfiles.fattyAcids?.variant === 'full'}
                  disabled={disabled || isFattyAcidsDisabled}
                  onChange={() => handleFattyAcidVariantChange('full')}
                  style={{
                    width: '16px',
                    height: '16px',
                    minWidth: '16px',
                    maxWidth: '16px',
                    flexShrink: 0,
                    margin: '0.15rem 0 0 0',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                />
                <span style={{ lineHeight: 1.35 }}>
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
