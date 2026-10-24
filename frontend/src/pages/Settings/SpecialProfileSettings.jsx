import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { Plus, Trash2, Save, Sliders, Check, Layers, AlertCircle } from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function SpecialProfileSettings() {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('waterIso10500');
  const [activeProfile, setActiveProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeVariantKey, setActiveVariantKey] = useState(null);
  const [saving, setSaving] = useState(false);

  // Editable parameters list for current view
  const [params, setParams] = useState([]);

  // Fetch summary on mount
  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/special-profiles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfiles(res.data);
      if (res.data.length > 0 && !selectedKey) {
        setSelectedKey(res.data[0].key);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load special profiles');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full profile when selectedKey changes
  useEffect(() => {
    if (!selectedKey) return;
    fetchFullProfile(selectedKey);
  }, [selectedKey]);

  const fetchFullProfile = async (key) => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/special-profiles/${key}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setActiveProfile(data);

      if (data.variants && data.variants.length > 0) {
        // Default to first variant
        const firstVar = data.variants[0];
        setActiveVariantKey(firstVar.key);
        setParams(firstVar.parameters || []);
      } else {
        setActiveVariantKey(null);
        setParams(data.parameters || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile details');
    } finally {
      setProfileLoading(false);
    }
  };

  // Switch variant
  const handleVariantChange = (vKey) => {
    setActiveVariantKey(vKey);
    const variant = (activeProfile?.variants || []).find(v => v.key === vKey);
    setParams(variant?.parameters || []);
  };

  // Handle cell edits
  const handleParamChange = (index, field, value) => {
    setParams(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add a new row
  const handleAddRow = () => {
    setParams(prev => [
      ...prev,
      {
        name: '',
        unit: selectedKey === 'waterIso10500' ? 'mg/L' : (selectedKey === 'fattyAcids' ? '%' : 'mg/kg'),
        testMethod: '',
        specification: '',
        requirement: '',
        permissibleLimit: '',
        isCategoryHeader: false
      }
    ]);
  };

  // Delete row
  const handleDeleteRow = (index) => {
    setParams(prev => prev.filter((_, i) => i !== index));
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/special-profiles/${selectedKey}/parameters`;
      if (activeVariantKey) {
        url = `${API_URL}/api/special-profiles/${selectedKey}/variants/${activeVariantKey}/parameters`;
      }

      await axios.put(
        url,
        { parameters: params },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Profile parameters saved successfully');
      fetchSummary();
      // Update local activeProfile state
      if (activeVariantKey) {
        setActiveProfile(prev => ({
          ...prev,
          variants: (prev.variants || []).map(v => v.key === activeVariantKey ? { ...v, parameters: params } : v)
        }));
      } else {
        setActiveProfile(prev => ({ ...prev, parameters: params }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save parameters');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Spinner size={32} />
      </div>
    );
  }

  const isWaterIso = selectedKey === 'waterIso10500';
  const isPesticides = selectedKey === 'pesticides';
  const isFattyAcids = selectedKey === 'fattyAcids';

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Top Profile Selector Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {profiles.map(p => {
          const isSelected = p.key === selectedKey;
          const paramCount = p.parameterCount || (p.variants || []).reduce((sum, v) => sum + (v.parameterCount || 0), 0);

          return (
            <div
              key={p.key}
              onClick={() => setSelectedKey(p.key)}
              style={{
                padding: '1.25rem',
                borderRadius: '8px',
                border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: isSelected ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                  {p.label}
                </span>
                {p.isExclusive && (
                  <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>
                    Exclusive
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                {p.description}
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)' }}>
                {p.variants && p.variants.length > 0
                  ? `${p.variants.length} panels (${paramCount} parameters)`
                  : `${paramCount} parameters`}
              </div>
            </div>
          );
        })}
      </div>

      {profileLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner size={28} />
        </div>
      ) : activeProfile ? (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.5rem' }}>
          {/* Header & Variant Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={20} style={{ color: 'var(--color-primary)' }} />
                {activeProfile.label}
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {activeProfile.description}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={handleAddRow}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Add Parameter
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Sub-variant tabs if present */}
          {activeProfile.variants && activeProfile.variants.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              {activeProfile.variants.map(v => (
                <button
                  key={v.key}
                  className={`btn ${activeVariantKey === v.key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleVariantChange(v.key)}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                >
                  <Layers size={14} style={{ marginRight: '0.4rem' }} />
                  {v.label} ({(v.parameters || []).length})
                </button>
              ))}
            </div>
          )}

          {/* Parameter Table */}
          <div className="table-scroll" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-surface-hover)', zIndex: 1 }}>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th>Parameter Name</th>
                  <th style={{ width: '90px' }}>Unit</th>
                  {isWaterIso && <th>Test Method</th>}
                  {isWaterIso && <th>Requirement</th>}
                  {isWaterIso && <th>Permissible Limit</th>}
                  {isWaterIso && <th style={{ width: '110px', textAlign: 'center' }}>Category?</th>}
                  {isFattyAcids && <th>Test Method</th>}
                  {(isFattyAcids || isPesticides) && <th>Specification</th>}
                  <th style={{ width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {params.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      No parameters defined. Click "Add Parameter" above to get started.
                    </td>
                  </tr>
                ) : (
                  params.map((p, idx) => {
                    const isHeader = Boolean(p.isCategoryHeader);

                    return (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: isHeader ? 'rgba(52, 152, 219, 0.08)' : 'transparent',
                          fontWeight: isHeader ? 600 : 400
                        }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={p.name || ''}
                            onChange={(e) => handleParamChange(idx, 'name', e.target.value)}
                            placeholder={isHeader ? 'Category Header (e.g. General Parameters)' : 'Parameter Name'}
                            style={{
                              width: '100%',
                              padding: '0.35rem 0.5rem',
                              fontWeight: isHeader ? 700 : 400,
                              color: isHeader ? 'var(--color-primary-dark)' : 'inherit'
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={p.unit || ''}
                            onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                            disabled={isHeader}
                            placeholder="Unit"
                            style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                          />
                        </td>
                        {isWaterIso && (
                          <>
                            <td>
                              <input
                                type="text"
                                value={p.testMethod || ''}
                                onChange={(e) => handleParamChange(idx, 'testMethod', e.target.value)}
                                disabled={isHeader}
                                placeholder="Method"
                                style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={p.requirement || ''}
                                onChange={(e) => handleParamChange(idx, 'requirement', e.target.value)}
                                disabled={isHeader}
                                placeholder="Requirement"
                                style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={p.permissibleLimit || ''}
                                onChange={(e) => handleParamChange(idx, 'permissibleLimit', e.target.value)}
                                disabled={isHeader}
                                placeholder="Permissible Limit"
                                style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isHeader}
                                onChange={(e) => handleParamChange(idx, 'isCategoryHeader', e.target.checked)}
                                title="Toggle category divider row"
                              />
                            </td>
                          </>
                        )}
                        {isFattyAcids && (
                          <>
                            <td>
                              <input
                                type="text"
                                value={p.testMethod || ''}
                                onChange={(e) => handleParamChange(idx, 'testMethod', e.target.value)}
                                placeholder="Method"
                                style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={p.specification || ''}
                                onChange={(e) => handleParamChange(idx, 'specification', e.target.value)}
                                placeholder="Spec"
                                style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                              />
                            </td>
                          </>
                        )}
                        {isPesticides && (
                          <td>
                            <input
                              type="text"
                              value={p.specification || ''}
                              onChange={(e) => handleParamChange(idx, 'specification', e.target.value)}
                              placeholder="Spec"
                              style={{ width: '100%', padding: '0.35rem 0.5rem' }}
                            />
                          </td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.2rem' }}
                            title="Delete row"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Total: {params.length} parameters
            </span>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
