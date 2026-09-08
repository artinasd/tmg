import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonIcon from '@mui/icons-material/Person';

// --- Inline Component Definitions ---

const ThreeElementCard = ({ bg, title, number, children }) => (
    <div className={`${bg} rounded-lg p-4 text-white shadow-lg flex items-center justify-between`}>
        <div>
            <p className="text-sm opacity-90 font-medium">{title}</p>
            <h4 className="text-3xl font-bold mt-1">{number}</h4>
        </div>
        <div className="p-3 bg-white/20 rounded-full">
            {children}
        </div>
    </div>
);

const Table = ({ title, headers, rows }) => (
    <div className="bg2 rounded-lg p-6 shadow-lg overflow-hidden border border-gray-700/50 h-full">
        <h3 className="text-xl font-bold mb-6 text-white text-left">{title}</h3>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                <tr className="border-b border-gray-700 text-left">
                    {headers.map((header, index) => (
                        <th key={index} className="pb-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {header}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-700/30 transition-colors duration-150">
                        {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="py-4 px-4 text-sm whitespace-nowrap text-left">
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    </div>
);

// --- Main Component ---

function OrganizationDetails() {
    const { orgCode } = useParams();
    const navigate = useNavigate();

    // Data States
    const [organization, setOrganization] = useState(null);
    const [units, setUnits] = useState([]);
    const [orgEmployees, setOrgEmployees] = useState([]);
    const [extraDetails, setExtraDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState(null);

    // --- Modal & Search States ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [foundAccount, setFoundAccount] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [submittingBoss, setSubmittingBoss] = useState(false);

    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    // Headers
    const unitHeaders = ["UNIT", "BOSS", "EMPLOYEES", "ACTIONS"];
    const orgEmployeeHeaders = ["EMPLOYEE", "ROLE", "JOIN DATE", "ACTIONS"];
    const employeeHeaders = ["NAME", "USERNAME", "EMAIL", "STATUS"];

    const fetchOrganizationData = useCallback(async () => {
        if (!orgCode) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [organizationResult, detailsResult, employeesResult, unitsResult] = await Promise.allSettled([
                api.get(`/api/orgs/${orgCode}`),
                api.get(`/api/orgs/${orgCode}/details`),
                api.get(`/api/orgs/${orgCode}/employees`),
                api.get(`/api/orgs/${orgCode}/units`),
            ]);

            if (organizationResult.status === 'rejected') {
                throw organizationResult.reason;
            }

            setOrganization(organizationResult.value);
            setExtraDetails(detailsResult.status === 'fulfilled' ? detailsResult.value : null);
            setOrgEmployees(
                employeesResult.status === 'fulfilled' && Array.isArray(employeesResult.value)
                    ? employeesResult.value
                    : []
            );
            setUnits(
                unitsResult.status === 'fulfilled' && Array.isArray(unitsResult.value)
                    ? unitsResult.value
                    : []
            );

            if (detailsResult.status === 'rejected' || employeesResult.status === 'rejected' || unitsResult.status === 'rejected') {
                setActionError('Some organization details could not be loaded.');
            }
        } catch (error) {
            console.error('Failed to load organization details:', error);
            setOrganization(null);
            setExtraDetails(null);
            setOrgEmployees([]);
            setUnits([]);
            setActionError(error?.message || 'Failed to load organization details.');
        } finally {
            setLoading(false);
        }
    }, [orgCode]);

    useEffect(() => {
        if (!orgCode) return;

        let cancelled = false;

        const loadRole = async () => {
            try {
                const fetchedRole = await api.get(`/api/orgs/getRole/${orgCode}`);
                if (!cancelled && fetchedRole) {
                    setRole(String(fetchedRole));
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load organization role:', error);
                }
            }
        };

        loadRole();
        return () => {
            cancelled = true;
        };
    }, [orgCode]);

    useEffect(() => {
        fetchOrganizationData();
    }, [fetchOrganizationData]);

    // --- Search & Action Logic ---
    async function handleSearchAccount() {
        const query = searchQuery.trim();
        if (!query) {
            setSearchError('Enter a username or phone number.');
            return;
        }

        setSearchLoading(true);
        setSearchError('');
        setFoundAccount(null);

        const isPhoneNumber = /^\+?[0-9]+$/.test(query);
        const paramName = isPhoneNumber ? 'phoneNumber' : 'accountID';

        try {
            const data = await api.get(`/api/accounts/findAccount?${paramName}=${encodeURIComponent(query)}`);
            if (Array.isArray(data) && data.length > 0) {
                setFoundAccount(data[0]);
            } else {
                setSearchError('No account found.');
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError(error?.message || 'Error searching for account.');
        } finally {
            setSearchLoading(false);
        }
    }

    async function handleBossSubmit() {
        if (!foundAccount?.accountCode) {
            setSearchError('No account selected.');
            return;
        }

        setSubmittingBoss(true);
        setActionError('');
        setActionSuccess('');

        try {
            await api.patch(
                `/api/orgs/${orgCode}/changeBoss?newBossCode=${encodeURIComponent(foundAccount.accountCode)}`,
                undefined
            );
            closeEditModal();
            setActionSuccess('Organization boss changed successfully.');
            await fetchOrganizationData();
        } catch (error) {
            console.error('Failed to change organization boss:', error);
            setActionError(error?.message || 'Failed to change organization boss.');
        } finally {
            setSubmittingBoss(false);
        }
    }

    async function deleteOrganization() {
        if (!window.confirm('Are you sure you want to delete this organization?')) return;

        setActionError('');
        setActionSuccess('');

        try {
            await api.delete(`/api/orgs/delete/${orgCode}`);
            navigate('/home/organizations');
        } catch (error) {
            console.error('Failed to delete organization:', error);
            setActionError(error?.message || 'Failed to delete organization.');
        }
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSearchQuery('');
        setFoundAccount(null);
        setSearchError('');
    };

    const getOrgField = (field) => {
        if (!organization) return '-';
        return organization[field] || organization[field.charAt(0).toUpperCase() + field.slice(1)] || organization[field.toUpperCase()] || '-';
    };

    const renderDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    // --- Row Generators ---

    const unitRows = units.map(unit => [
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                <GroupsOutlinedIcon style={{ fontSize: '16px', color: 'white' }} />
            </div>
            <div>
                <span className="font-medium text-white">{unit.unitName || unit.name || '-'}</span>
                <p className="text-xs text2">{unit.unitCode?.substring(0,8) || '-'}...</p>
            </div>
        </div>,
        <div>
            <span className="text-white">{unit.boss?.account?.accountName || '-'}</span>
        </div>,
        <span className="text-white">{unit.employees?.length || 0}</span>,
        <div className="flex space-x-2">
            <button
                onClick={() => navigate(`/home/organizations/${orgCode}/units/${unit.unitCode}`)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-medium text-white transition"
            >
                View
            </button>
        </div>
    ]);

    // Rows for the fetched Organization Employees
    const orgEmployeeRows = orgEmployees.map(empData => {
        const account = empData.employee?.account || empData.account;
        const roleName = empData.role?.roleName || "Member";
        const joinTime = empData.joinTime || empData.createTime;

        return [
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                    <PersonIcon style={{ fontSize: '16px', color: 'white' }} />
                </div>
                <div>
                    <span className="font-medium text-white">{account?.accountName || 'Unknown'}</span>
                    <p className="text-xs text2">{account?.email || '-'}</p>
                </div>
            </div>,
            <span className={`text-xs px-2 py-1 rounded ${roleName === 'Admin' ? 'bg-yellow-600/50 text-yellow-200' : 'bg-gray-700 text-gray-300'}`}>
                {roleName}
            </span>,
            <span className="text2">{renderDate(joinTime)}</span>,
            <button
                onClick={() => navigate(`/home/organizations/${orgCode}/employees/manage`)}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
                Manage
            </button>
        ];
    });

    const detailedEmployeeRows = extraDetails?.employees?.map(emp => [
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs">
                {emp.accountName ? emp.accountName.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="font-medium text-white">{emp.accountName || '-'}</span>
        </div>,
        <span className="text2 text-sm">{emp.username || '-'}</span>,
        <span className="text2 text-sm">{emp.email || '-'}</span>,
        <span className={`text-xs px-2 py-1 rounded ${emp.status === 'ACTIVE' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {emp.status || 'Unknown'}
        </span>
    ]) || [];


    if (loading && !organization) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xl text2">Loading organization details...</div>
                </div>
            </div>
        );
    }

    if (!organization && !loading) {
        return (
            <div className="text-center py-12 bg2 rounded-lg mt-4">
                <h2 className="text-xl font-semibold mb-2 text-white">Organization not found</h2>
                <button
                    onClick={() => navigate('/home/organizations')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                    Back to Organizations
                </button>
            </div>
        );
    }

    return (
        <div className="p-2 relative">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/home/organizations')}
                    className="flex items-center justify-center w-10 h-10 bg2 hover:bg-gray-700 rounded-lg transition text-white"
                >
                    <ArrowBackIcon style={{ fontSize: '20px' }} />
                </button>
                <div className="flex-1">
                    <h2 className='text-2xl font-bold mb-1 text-white'>{getOrgField('title')}</h2>
                    <p className='text2 text-sm'>{getOrgField('description')}</p>
                </div>
                {role === 'OWNER' &&(
                    <div className="flex space-x-3">
                        <button
                            onClick={() => navigate(`/home/organizations/${orgCode}/units/create`)}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition shadow-sm"
                        >
                            <AddIcon style={{ fontSize: '20px' }} />
                            <span className="font-medium">Add Unit</span>
                        </button>
                        <button
                            onClick={() => navigate(`/home/organizations/${orgCode}/employees/manage`)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
                        >
                            <PersonAddIcon style={{ fontSize: '20px' }} />
                            <span className="font-medium">Manage Employees</span>
                        </button>
                    </div>
                )}
            </div>

            {actionError && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {actionError}
                </div>
            )}
            {actionSuccess && (
                <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                    {actionSuccess}
                </div>
            )}

            {/* Organization Info Card */}
            <div className="bg2 rounded-lg p-6 mb-6 shadow-md border border-gray-700/30">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                            <BusinessOutlinedIcon style={{ fontSize: '32px', color: 'white' }} />
                        </div>
                        <div>
                            <div className='flex flex-row items-center space-x-4'>
                                <h3 className="text-xl font-semibold text-white">{getOrgField('title')}</h3>
                            </div>
                            <p className="text2 mt-1 text-sm">{getOrgField('description')}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text2 uppercase tracking-wide">
                                <span>Created: {renderDate(organization.createTime || organization.CreateTime)}</span>
                                <span className="text-gray-600">•</span>
                                <span>Code: {getOrgField('orgCode')}</span>
                            </div>
                        </div>
                    </div>
                    {role === 'OWNER' && (
                        <div className='flex flex-row items-center gap-2'>
                            <button
                                className='bg-red-500/10 text-red-400 border border-red-500/50 rounded-lg px-4 py-2 hover:bg-red-500 hover:text-white transition duration-200'
                                onClick={deleteOrganization}
                            >
                                Delete
                            </button>

                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition shadow-sm"
                            >
                                <EditIcon style={{ fontSize: '16px' }} />
                                <span>Edit Boss</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8'>
                <ThreeElementCard bg='bg-gradient-to-br from-blue-600 to-blue-700' title='Total Units' number={units.length}>
                    <GroupsOutlinedIcon style={{fontSize: '28px'}} />
                </ThreeElementCard>

                <ThreeElementCard bg='bg-gradient-to-br from-green-600 to-green-700' title='Total Employees' number={orgEmployees.length || organization.employeesAccountCode?.length || 0}>
                    <PeopleAltOutlinedIcon style={{fontSize: '28px'}} />
                </ThreeElementCard>

                <ThreeElementCard bg='bg-gradient-to-br from-purple-600 to-purple-700' title='Unit Admins' number={units.filter(u => u.boss).length}>
                    <AdminPanelSettingsOutlinedIcon style={{fontSize: '28px'}} />
                </ThreeElementCard>

                <ThreeElementCard bg='bg-gradient-to-br from-orange-600 to-orange-700' title='Hierarchical Levels' number={
                    units.length > 0
                        ? Math.max(...units.map(u => (u.unitPath ? u.unitPath.split('.').length : 0)), 0)
                        : 0
                }>
                    <BusinessOutlinedIcon style={{fontSize: '28px'}} />
                </ThreeElementCard>
            </div>

            {role === 'OWNER' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 h-96'>
                    {/* --- ORGANIZATION EMPLOYEES TABLE --- */}
                    <div className="h-full">
                        {orgEmployees.length > 0 ? (
                            <Table title='Organization Members' headers={orgEmployeeHeaders} rows={orgEmployeeRows} />
                        ) : (
                            <div className="bg2 rounded-lg p-6 h-full flex flex-col items-center justify-center text-center border border-gray-700/50">
                                <PeopleAltOutlinedIcon style={{ fontSize: '64px', color: '#4B5563' }} />
                                <h3 className="text-xl font-semibold mt-4 mb-2 text-white">No Employees</h3>
                                <p className="text2 mb-4">Add employees to start building your organization.</p>
                                <button
                                    onClick={() => navigate(`/home/organizations/${orgCode}/employees/manage`)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                                >
                                    Add Employee
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- UNITS TABLE --- */}
                    <div className="h-full">
                        {units.length > 0 ? (
                            <Table title='Organization Units' headers={unitHeaders} rows={unitRows} />
                        ) : (
                            <div className="bg2 rounded-lg p-6 h-full flex flex-col items-center justify-center text-center border border-gray-700/50">
                                <GroupsOutlinedIcon style={{ fontSize: '64px', color: '#4B5563' }} />
                                <h3 className="text-xl font-semibold mt-4 mb-2 text-white">No Units Yet</h3>
                                <p className="text2 mb-6 max-w-md mx-auto">
                                    This organization has no units.
                                </p>
                                <button
                                    onClick={() => navigate(`/home/organizations/${orgCode}/units/create`)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                                >
                                    Create Unit
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Extra Details */}
            {extraDetails && (
                <div className="mt-8 pt-8 border-t border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <AdminPanelSettingsOutlinedIcon className="text-purple-500" />
                        Detailed Administrative Information
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Boss/Owner Card */}
                        <div className="bg2 rounded-lg p-6 shadow-lg border border-gray-700/50 h-fit">
                            <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Organization Lead</h3>
                            {extraDetails.boss.account ? (
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shrink-0 shadow-md">
                                        <BadgeOutlinedIcon style={{ color: 'white' }} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">
                                            {extraDetails.boss?.account.accountName || extraDetails.owner?.accountName || "Unknown Name"}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text2 mt-1">
                                            <MailOutlineIcon style={{ fontSize: '14px' }} />
                                            <span>{extraDetails.boss?.account.email || extraDetails.owner?.email || "No Email"}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text2 text-sm italic">No specific boss/owner information assigned.</p>
                            )}
                        </div>

                        {/* Employee List (Detailed) */}
                        <div className="lg:col-span-2">
                            {extraDetails.employees && extraDetails.employees.length > 0 ? (
                                <Table title={`All Accounts Data (${extraDetails.employees.length})`} headers={employeeHeaders} rows={detailedEmployeeRows} />
                            ) : (
                                <div className="bg2 rounded-lg p-6 text-center border border-gray-700/50">
                                    <p className="text2">No detailed employee records found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SEARCH & EDIT BOSS MODAL --- */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#1f2937] border border-gray-600 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-600 bg-gray-800">
                            <h3 className="text-lg font-semibold text-white">Change Organization Boss</h3>
                            <button
                                onClick={closeEditModal}
                                className="text-gray-400 hover:text-white transition"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <p className="text-sm text-gray-400 mb-4">
                                Search for an account using their <b>username</b> or <b>phone number</b> to assign them as the new boss.
                            </p>

                            {/* Search Input Area */}
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAccount()}
                                    placeholder="Enter username or phone number..."
                                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition placeholder-gray-500"
                                />
                                <button
                                    onClick={handleSearchAccount}
                                    disabled={searchLoading}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition flex items-center justify-center min-w-[50px]"
                                >
                                    {searchLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SearchIcon />}
                                </button>
                            </div>

                            {/* Error Message */}
                            {searchError && (
                                <div className="p-3 mb-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm text-center">
                                    {searchError}
                                </div>
                            )}

                            {/* Found Account Result Card */}
                            {foundAccount && (
                                <div className="mt-2 bg-gray-800/50 border border-gray-600 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Selected Account</p>
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                                            <BadgeOutlinedIcon className="text-white" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="text-white font-bold text-lg truncate">{foundAccount.accountName || 'Unknown Name'}</h4>

                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                                    <PersonOutlineIcon style={{ fontSize: 16 }} className="text-gray-500"/>
                                                    <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded text-xs">{foundAccount.accountID}</span>
                                                </div>

                                                {foundAccount.email && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                                        <MailOutlineIcon style={{ fontSize: 16 }} className="text-gray-500"/>
                                                        <span className="truncate">{foundAccount.email}</span>
                                                    </div>
                                                )}

                                                {foundAccount.phoneNumber && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                                        <PhoneAndroidIcon style={{ fontSize: 16 }} className="text-gray-500"/>
                                                        <span>{foundAccount.phoneNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-800 border-t border-gray-600 flex justify-end gap-3 mt-auto">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 rounded text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBossSubmit}
                                disabled={!foundAccount || submittingBoss}
                                className={`px-4 py-2 rounded text-sm font-medium text-white transition shadow-lg flex items-center gap-2
                                    ${!foundAccount || submittingBoss
                                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                    : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {submittingBoss ? 'Saving...' : 'Confirm Change'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OrganizationDetails;