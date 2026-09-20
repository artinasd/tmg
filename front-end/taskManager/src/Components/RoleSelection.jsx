import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { api, ApiError } from '../services/api.js';
import { activeRoleActions } from '../Redux/ActiveRoleSlice.js';

function extractField(value, fieldName) {
    if (!value) return '';
    if (typeof value === 'object') return value?.[fieldName] || '';

    const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(value).match(new RegExp(`${escapedField}=([^,)]*)`));
    return match?.[1]?.trim() || '';
}

function extractRoleName(employment) {
    if (!employment) return '';
    if (typeof employment === 'object') {
        return employment?.role?.name || employment?.role?.roleName || employment?.roleName || '';
    }

    const match = String(employment).match(/role=RoleDTO\(name=([^,)]+)/);
    return match?.[1]?.trim() || '';
}

function extractUnitName(employment) {
    if (!employment) return '';
    if (typeof employment === 'object') {
        return employment?.unit?.unitName || employment?.unitName || '';
    }

    const match = String(employment).match(/unit=PublicUnitDTO\(unitCode=[^,]+, unitName=([^,)]*)/);
    return match?.[1]?.trim() || '';
}

function normalizeRoleItem(employment, organization, index) {
    const roleName = extractRoleName(employment);
    const unitName = extractUnitName(employment);
    const organizationCode = organization?.orgCode || organization?.organizationCode || extractField(organization, 'orgCode');
    const organizationTitle = organization?.title || extractField(organization, 'title') || organizationCode || 'Organization';

    // A valid employment/organization entry is still selectable when role is null.
    // The backend response can contain an employment without an assigned role yet.
    if (!employment || !organization) return null;

    return {
        id: `${roleName || 'no-role'}-${unitName || 'no-unit'}-${organizationCode || index}`,
        roleName: roleName || 'No role assigned',
        unitName: unitName || 'Unit not assigned',
        organizationTitle,
        organizationCode,
        employment,
        organization,
        permissions: employment?.role?.permissions || employment?.permissions || [],
    };
}

export function normalizeRoles(payload) {
    if (Array.isArray(payload)) {
        return payload.map((item, index) => normalizeRoleItem(
            item?.employment || item,
            item?.organization || item?.org || {},
            index,
        )).filter(Boolean);
    }

    if (!payload || typeof payload !== 'object') return [];

    return Object.entries(payload)
        .map(([employmentKey, organization], index) => {
            let employment = employmentKey;
            try {
                employment = JSON.parse(employmentKey);
            } catch {
                // PublicEmploymentDTO is currently used as a Map key, so Jackson serializes
                // the key using its toString() representation rather than a JSON object.
            }
            return normalizeRoleItem(employment, organization, index);
        })
        .filter(Boolean);
}

function RoleSelection() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const loggedUser = useSelector(state => state.loggedUser);
    const accountCode = loggedUser?.userInfo?.accountCode;
    const [roles, setRoles] = useState([]);
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadRoles = useCallback(async () => {
        if (!accountCode) {
            navigate('/log-in', { replace: true });
            return;
        }

        setLoading(true);
        setError('');
        setSelected('');
        try {
            const encodedAccountCode = encodeURIComponent(accountCode);
            const response = await api.get(`/api/accounts/${encodedAccountCode}/roles?accountCode=${encodedAccountCode}`);
            const resolved = normalizeRoles(response);
            setRoles(resolved);

            if (resolved.length === 0 && response && typeof response === 'object' && !Array.isArray(response) && Object.keys(response).length === 0) {
                navigate('/home/dashboard', { replace: true });
                return;
            }

            if (resolved.length === 0) setError('No organization roles are available for this account.');
        } catch (err) {
            setRoles([]);
            setError(err instanceof ApiError ? err.message : 'Unable to load your roles.');
        } finally {
            setLoading(false);
        }
    }, [accountCode, navigate]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    function continueWithRole() {
        const role = roles.find(item => item.id === selected);
        if (!role) return;

        dispatch(activeRoleActions.setActiveRole({
            roleName: role.roleName,
            unitName: role.unitName,
            organizationName: role.organizationTitle,
            organizationTitle: role.organizationTitle,
            organizationCode: role.organizationCode,
            organization: role.organization,
            employment: role.employment,
            permissions: role.permissions,
        }));
        navigate('/home/dashboard', { replace: true });
    }

    if (loading) return <div className="min-h-screen bg1 flex items-center justify-center"><p className="text2">Loading your roles...</p></div>;

    return (
        <div className="min-h-screen bg1 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <PlaylistAddCheckRoundedIcon style={{ color: '#818cf8', fontSize: '56px' }} />
                    <h1 className="text-3xl font-bold mt-3">Choose your role</h1>
                    <p className="text2 mt-2">Select the organization role you want to use.</p>
                </div>

                {error && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg p-4 mb-5" role="alert">
                        <p>{error}</p>
                        <button type="button" onClick={loadRoles} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-400/40 hover:bg-amber-500/10 transition">
                            <RefreshRoundedIcon style={{ fontSize: '18px' }} /> Try again
                        </button>
                    </div>
                )}

                {roles.length > 0 && (
                    <div className="space-y-3" role="radiogroup" aria-label="Available roles">
                        {roles.map(role => (
                            <button key={role.id} type="button" role="radio" aria-checked={selected === role.id} onClick={() => setSelected(role.id)} className={`w-full text-left bg2 rounded-xl border p-5 transition ${selected === role.id ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-gray-700 hover:border-gray-500'}`}>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0"><BadgeOutlinedIcon aria-hidden="true" /></div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text2">Role</p>
                                            <p className="font-semibold text-lg truncate">{role.roleName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text2">Unit</p>
                                            <p className="font-medium truncate">{role.unitName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text2">Organization</p>
                                            <p className="font-medium truncate">{role.organizationTitle}</p>
                                        </div>
                                    </div>
                                    <span aria-hidden="true" className={`w-5 h-5 mt-1 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === role.id ? 'border-indigo-400' : 'border-gray-500'}`}>
                                        {selected === role.id && <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
                    <button type="button" onClick={() => navigate('/home/organizations')} className="px-4 py-2 rounded-lg bg2 border border-gray-700">Back</button>
                    <button type="button" onClick={continueWithRole} disabled={!selected} className="px-6 py-2 rounded-lg theme disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                </div>
            </div>
        </div>
    );
}

export default RoleSelection;
