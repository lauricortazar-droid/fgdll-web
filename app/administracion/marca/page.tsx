import { ProtectedAccess } from '../../protected-access';
import BrandManager from './brand-manager';
export const dynamic='force-dynamic';
export default function Page(){return <ProtectedAccess returnTo="/administracion/marca" allowedRoles={['admin']}><BrandManager/></ProtectedAccess>;}
