import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ThreeElementCard from './Costume UI Components/ThreeElementCard.jsx';
import Table from './Costume UI Components/Table.jsx';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { api, ApiError } from '../services/api.js';
import { activeRoleActions } from '../Redux/ActiveRoleSlice.js';
import { normalizeRoles } from './RoleSelection.jsx';

function OrganizationList() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const loggedUser = useSelector(state => state.loggedUser);
    const activeRole = useSelector(state => state.activeRole);
    const accountCode = loggedUser?.userInfo?.accountCode;
    const [organizations, setOrganizations] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [switchingRole, setSwitchingRole] = useState(false);

    const loadData = useCallback(async () => {
        if (!accountCode) {
            setOrganizations([]);
            setRoles([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const encodedAccountCode = encodeURIComponent(accountCode);
            const [organizationResult, roleResult] = await Promise.all([
                api.get(`/api/accounts/view/${encodedAccountCode}/orgs`),
                api.get(`/api/accounts/${encodedAccountCode}/roles?accountCode=${encodedAccountCode}`),
            ]);
            setOrganizations(Array.isArray(organizationResult) ? organizationResult : []);
            setRoles(normalizeRoles(roleResult));
        } catch (err) {
            setOrganizations([]);
            setRoles([]);
            setError(err instanceof ApiError ? err.message : 'Failed to load roles and organizations.');
        } finally {
            setLoading(false);
        }
    }, [accountCode]);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredOrganizations = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return organizations;
        return organizations.filter(org => [org.title, org.description, org.orgCode]
            .some(value => String(value || '').toLowerCase().includes(query)));
    }, [organizations, search]);

    const currentOrganization = organizations.find(org => org.orgCode === activeRole?.organizationCode);
    const currentRole = roles.find(role => role.organizationCode === activeRole?.organizationCode && role.roleName === activeRole?.roleName);

    function activateRole(role) {
        if (!role || switchingRole) return;
        setSwitchingRole(true);
        dispatch(activeRoleActions.setActiveRole({
            roleName: role.roleName,
            organizationName: role.organizationName,
            organizationCode: role.organizationCode,
            organization: role.organization,
            employment: role.employment,
            permissions: role.permissions,
        }));
        // The current backend has no active-role/session-switch endpoint; this updates the
        // frontend context without pretending to change the server-side authentication token.
        window.setTimeout(() => setSwitchingRole(false), 0);
    }

    const headers = ['ORGANIZATION', 'DESCRIPTION', 'UNITS', 'EMPLOYEES', 'STATUS', 'CREATED', 'ACTIONS'];
    const rows = filteredOrganizations.map(org => [
        <div className="flex items-center space-x-3" key={`name-${org.orgCode}`}>
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shrink-0"><BusinessOutlinedIcon style={{ fontSize: '16px', color: 'white' }} /></div>
            <div className="min-w-0"><span className="font-medium text-white block truncate">{org.title || 'Untitled organization'}</span><span className="text-xs text2 font-mono">{org.orgCode || '-'}</span></div>
        </div>,
        <span className="text2" key={`desc-${org.orgCode}`}>{org.description || '-'}</span>,
        <span className="text-white" key={`units-${org.orgCode}`}>{org.unitCodes?.length || 0}</span>,
        <span className="text-white" key={`employees-${org.orgCode}`}>{org.employeesAccountCode?.length || 0}</span>,
        <span className={org.isDeleted ? 'text-red-400' : 'text-green-400'} key={`status-${org.orgCode}`}>{org.isDeleted ? 'Deleted' : 'Active'}</span>,
        <span className="text2" key={`date-${org.orgCode}`}>{org.createTime ? new Date(org.createTime).toLocaleDateString() : '-'}</span>,
        <div className="flex flex-wrap gap-2" key={`actions-${org.orgCode}`}>
            <button type="button" onClick={() => navigate(`/home/organizations/${org.orgCode}`)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm transition">View</button>
            {!org.isDeleted && <button type="button" onClick={() => navigate(`/home/organizations/${org.orgCode}/units/create`)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition">Add Unit</button>}
        </div>,
    ]);

    const totalUnits = organizations.reduce((sum, org) => sum + (org.unitCodes?.length || 0), 0);
    const totalEmployees = organizations.reduce((sum, org) => sum + (org.employeesAccountCode?.length || 0), 0);

    if (loading) return <div className="flex justify-center items-center h-64"><div className="text-xl text2">Loading role and organizations...</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div><h2 className="text-2xl font-bold mb-1">Role & Organizations</h2><p className="text2">Choose your active role and organization context, then manage the organizations available to your account.</p></div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"><RefreshIcon style={{ fontSize: '18px' }} /> Refresh</button>
                    <button type="button" onClick={() => navigate('/home/organizations/create')} className="flex items-center gap-2 px-4 py-2 theme hover:themeHover rounded-lg transition"><AddBusinessOutlinedIcon style={{ fontSize: '20px' }} /> Create Organization</button>
                </div>
            </div>

            {error && <div className="bg-red-900/40 border border-red-700 text-red-200 p-4 rounded-lg" role="alert">{error}</div>}

            <section className="bg2 rounded-xl border border-indigo-500/30 p-5">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0"><BadgeOutlinedIcon /></div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-wider text2">Active context</p>
                        {activeRole ? <><h3 className="text-xl font-semibold mt-1">{activeRole.roleName}</h3><p className="text2 mt-1">{activeRole.organizationName}{activeRole.organizationCode ? ` · ${activeRole.organizationCode}` : ''}</p></> : <p className="text2 mt-2">No role selected.</p>}
                    </div>
                    <button type="button" onClick={() => navigate('/select-role')} className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 hover:border-indigo-400 transition"><SwapHorizOutlinedIcon style={{ fontSize: '18px' }} /> Switch</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-700">
                    <div><p className="text2 text-xs uppercase">Current organization</p><p className="font-medium mt-1">{currentOrganization?.title || activeRole?.organizationName || '—'}</p></div>
                    <div><p className="text2 text-xs uppercase">Organization status</p><p className={`font-medium mt-1 ${currentOrganization?.isDeleted ? 'text-red-400' : 'text-green-400'}`}>{currentOrganization ? (currentOrganization.isDeleted ? 'Deleted' : 'Active') : 'Unavailable'}</p></div>
                    <div><p className="text2 text-xs uppercase">Active role assignment</p><p className="font-medium mt-1">{currentRole ? 'Loaded' : 'Not found in current role list'}</p></div>
                </div>
            </section>

            <section className="bg2 rounded-xl border border-gray-700 p-5">
                <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="text-lg font-semibold">Available roles</h3><p className="text2 text-sm mt-1">Role choices are shown with their organization so identical role names are not ambiguous.</p></div></div>
                {roles.length === 0 ? <div className="rounded-lg bg1 p-6 text-center text2">No role assignments were returned by the backend.</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {roles.map(role => {
                        const selected = activeRole?.roleName === role.roleName && activeRole?.organizationCode === role.organizationCode;
                        return <button key={role.id} type="button" onClick={() => activateRole(role)} disabled={switchingRole} aria-pressed={selected} className={`text-left rounded-lg border p-4 transition ${selected ? 'border-indigo-400 bg-indigo-500/10' : 'border-gray-700 hover:border-gray-500'}`}>
                            <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0"><BadgeOutlinedIcon fontSize="small" /></div><div className="min-w-0"><p className="font-semibold truncate">{role.roleName}</p><p className="text2 text-sm mt-1 truncate">{role.organizationName}</p><p className="text2 text-xs mt-1 font-mono truncate">{role.organizationCode || '—'}</p></div></div>
                            <p className={`text-xs mt-3 ${selected ? 'text-indigo-300' : 'text2'}`}>{selected ? 'Active role' : 'Use this role'}</p>
                        </button>;
                    })}
                </div>}
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <ThreeElementCard bg="bg-indigo-600" title="Total Organizations" number={organizations.length}><BusinessOutlinedIcon style={{ fontSize: '28px' }} /></ThreeElementCard>
                <ThreeElementCard bg="bg-blue-600" title="Total Units" number={totalUnits}><GroupsOutlinedIcon style={{ fontSize: '28px' }} /></ThreeElementCard>
                <ThreeElementCard bg="bg-green-600" title="Total Employees" number={totalEmployees}><PeopleAltOutlinedIcon style={{ fontSize: '28px' }} /></ThreeElementCard>
                <ThreeElementCard bg="bg-purple-600" title="Active Organization" number={currentOrganization && !currentOrganization.isDeleted ? 1 : 0}><BusinessOutlinedIcon style={{ fontSize: '28px' }} /></ThreeElementCard>
            </div>

            <div className="bg2 rounded-lg p-4"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..." aria-label="Search organizations" className="w-full bg-transparent border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" /></div>
            {organizations.length === 0 ? <div className="bg2 rounded-lg p-12 text-center"><BusinessOutlinedIcon style={{ fontSize: '64px', color: '#6B7280' }} /><h3 className="text-xl font-semibold mt-4 mb-2">No Organizations Yet</h3><p className="text2 mb-6">Create an organization to start a new organization context.</p><button type="button" onClick={() => navigate('/home/organizations/create')} className="inline-flex items-center gap-2 px-6 py-3 theme hover:themeHover rounded-lg transition"><AddBusinessOutlinedIcon style={{ fontSize: '20px' }} /> Create Organization</button></div> : filteredOrganizations.length === 0 ? <div className="bg2 rounded-lg p-12 text-center text2">No organizations match your search.</div> : <Table title="Organizations Overview" headers={headers} rows={rows} />}

            <div className="bg2 rounded-lg border border-amber-500/20 p-4 text-sm text2"><strong className="text-amber-200">Joining an organization:</strong> the current backend exposes organization creation and owner-managed employee addition, but no self-service join/invitation endpoint. The frontend does not fake a join operation.</div>
        </div>
    );
}

export default OrganizationList;
