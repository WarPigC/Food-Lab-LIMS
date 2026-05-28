import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../utils/api';
import Spinner from './Spinner';
import { AlertCircle, FileText, Beaker } from 'lucide-react';

const CascadingParameterSelector = ({ 
  label = "Parameters", 
  onDataChange, 
  modeClass = "", // For styling specific to nabl/non-nabl cards
  initialData = null 
}) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  
  const [subGroups, setSubGroups] = useState([]);
  const [selectedSubGroups, setSelectedSubGroups] = useState([]);
  
  const [productCategories, setProductCategories] = useState([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState('');
  
  const [parameters, setParameters] = useState([]);
  const [isPesticidePanel, setIsPesticidePanel] = useState(false);
  const [pesticidePanelType, setPesticidePanelType] = useState(null);
  const [pesticideSubPanels, setPesticideSubPanels] = useState([]);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSubGroups, setLoadingSubGroups] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [error, setError] = useState('');

  // Notify parent whenever significant data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        parameters: isPesticidePanel ? [] : parameters,
        groupMetadata: {
          group: selectedGroups.join(', '),
          subGroup: selectedSubGroups.join(', '),
          productCategory: selectedProductCategory
        },
        pesticidePanel: {
          enabled: isPesticidePanel,
          panelType: pesticidePanelType
        }
      });
    }
  }, [parameters, selectedGroups, selectedSubGroups, selectedProductCategory, isPesticidePanel, pesticidePanelType, onDataChange]);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/parameter-groups/groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGroups(res.data || []);
      } catch (err) {
        setError('Failed to fetch parameter groups');
        console.error(err);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  // Fetch subgroups when groups change
  useEffect(() => {
    if (selectedGroups.length === 0) {
      setSubGroups([]);
      setSelectedSubGroups([]);
      return;
    }
    
    const fetchSubGroups = async () => {
      setLoadingSubGroups(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/parameter-groups/subgroups?groups=${encodeURIComponent(selectedGroups.join(','))}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Remove duplicates if any
        const uniqueSubGroups = Array.from(new Set(res.data.map(s => s.subGroup)))
          .map(name => res.data.find(s => s.subGroup === name));
          
        setSubGroups(uniqueSubGroups);
        
        // Retain selected subgroups if they still exist in the new list, otherwise clear
        setSelectedSubGroups(prev => prev.filter(sg => uniqueSubGroups.some(u => u.subGroup === sg)));
      } catch (err) {
        setError('Failed to fetch subgroups');
        console.error(err);
      } finally {
        setLoadingSubGroups(false);
      }
    };
    fetchSubGroups();
  }, [selectedGroups]);

  // Fetch details when subgroups change
  useEffect(() => {
    if (selectedGroups.length === 0 || selectedSubGroups.length === 0) {
      setParameters([]);
      setProductCategories([]);
      setSelectedProductCategory('');
      setIsPesticidePanel(false);
      setPesticideSubPanels([]);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/parameter-groups/details?groups=${encodeURIComponent(selectedGroups.join(','))}&subGroups=${encodeURIComponent(selectedSubGroups.join(','))}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let allParams = [];
        let allCats = new Set();
        let isPanel = false;
        let panelType = null;
        let pSubPanels = [];
        
        res.data.forEach(detail => {
          (detail.productCategories || []).forEach(c => allCats.add(c));
          
          if (detail.isPesticidePanel) {
            isPanel = true;
            panelType = detail.pesticidePanelType;
            pSubPanels = detail.pesticideSubPanels || [];
          } else {
            (detail.parameters || []).forEach(p => {
              if (!allParams.some(ext => ext.name === p.name)) {
                allParams.push({
                  parameterId: p._id,
                  name: p.name,
                  type: p.type,
                  unit: p.unit
                });
              }
            });
          }
        });
        
        setProductCategories(Array.from(allCats).sort());
        setParameters(allParams);
        setIsPesticidePanel(isPanel);
        setPesticidePanelType(panelType);
        setPesticideSubPanels(pSubPanels);
        
        // Reset product category if it's no longer in the list
        if (selectedProductCategory && !allCats.has(selectedProductCategory)) {
          setSelectedProductCategory('');
        }
      } catch (err) {
        setError('Failed to fetch parameter details');
        console.error(err);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedSubGroups, selectedGroups]);

  const handleGroupSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedGroups.includes(value)) {
      setSelectedGroups([...selectedGroups, value]);
    }
  };

  const handleGroupRemove = (group) => {
    setSelectedGroups(selectedGroups.filter(g => g !== group));
  };

  const handleSubGroupSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedSubGroups.includes(value)) {
      setSelectedSubGroups([...selectedSubGroups, value]);
    }
  };

  const handleSubGroupRemove = (subGroup) => {
    setSelectedSubGroups(selectedSubGroups.filter(sg => sg !== subGroup));
  };

  return (
    <div className={`cascading-selector ${modeClass}`} style={{ 
      display: 'flex', flexDirection: 'column', gap: '1rem', 
      padding: '1.25rem', backgroundColor: 'var(--color-surface)', 
      borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' 
    }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {label}
      </h3>
      
      {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>{error}</div>}
      
      <div className="flex-row-responsive">
        {/* GROUPS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Group(s)</label>
          <select 
            onChange={handleGroupSelect} 
            value=""
            disabled={loadingGroups}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">{loadingGroups ? 'Loading...' : '-- Add Group --'}</option>
            {groups.filter(g => !selectedGroups.includes(g)).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {selectedGroups.map(g => (
              <div key={g} className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem' }}>
                {g}
                <button 
                  type="button" 
                  onClick={() => handleGroupRemove(g)} 
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <AlertCircle size={14} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SUBGROUPS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Sub-Group(s)</label>
          <select 
            onChange={handleSubGroupSelect} 
            value=""
            disabled={loadingSubGroups || selectedGroups.length === 0}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">{loadingSubGroups ? 'Loading...' : '-- Add Sub-Group --'}</option>
            {subGroups.filter(sg => !selectedSubGroups.includes(sg.subGroup)).map(sg => (
              <option key={sg.subGroup} value={sg.subGroup}>
                {sg.subGroup} {sg.isPesticidePanel ? '(Panel)' : ''}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {selectedSubGroups.map(sg => (
              <div key={sg} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem' }}>
                {sg}
                <button 
                  type="button" 
                  onClick={() => handleSubGroupRemove(sg)} 
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <AlertCircle size={14} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-row-responsive">
        {/* PRODUCT CATEGORY */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Product Category (Aggregate)</label>
          <select 
            value={selectedProductCategory} 
            onChange={e => setSelectedProductCategory(e.target.value)}
            disabled={productCategories.length === 0}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">{productCategories.length === 0 ? '-- No Categories Available --' : '-- Select Category --'}</option>
            {productCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PARAMETERS PREVIEW */}
      <div style={{ marginTop: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Auto-Selected Parameters</h4>
        {loadingDetails ? (
          <Spinner message="Loading parameters..." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isPesticidePanel && (
              <div style={{ 
                backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', 
                padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: '1rem' 
              }}>
                <Beaker size={24} style={{ flexShrink: 0 }} />
                <div>
                  <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>Pesticide Panel Selected (Food)</h5>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    This will automatically create separate assignments for:
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                      {pesticideSubPanels.map(sp => (
                        <li key={sp.panelName}>{sp.panelName} ({sp.parameterCount} parameters)</li>
                      ))}
                    </ul>
                  </p>
                </div>
              </div>
            )}
            
            {parameters.length > 0 && (
              <div style={{ 
                maxHeight: '200px', overflowY: 'auto', 
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--color-surface)' 
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: 'var(--color-surface-hover)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Parameter Name</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)', width: '80px' }}>Type</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)', width: '120px' }}>Default Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parameters.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.4rem 0.5rem' }}>{p.name}</td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <span className={`badge ${p.type === 'Micro' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                            {p.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem', color: 'var(--color-text-muted)' }}>{p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!isPesticidePanel && parameters.length === 0 && selectedSubGroups.length > 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem', textAlign: 'center', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                No standard parameters found for selected sub-groups.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CascadingParameterSelector;
