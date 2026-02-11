import type { UserRole, UserCategoryPermission } from '@/src/core/types/database';

/**
 * Tipo parcial de permisos de categoria.
 * Se usa para verificar permisos sin requerir todos los campos de UserCategoryPermission.
 */
type CategoryPermissions = Pick<UserCategoryPermission, 'can_view' | 'can_create' | 'can_edit'>;

/**
 * Verifica si el usuario es administrador.
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Verifica si el usuario puede ver una categoria.
 *
 * - Admin y Manager pueden ver todas las categorias.
 * - Viewer solo puede ver si tiene permiso explicito (can_view).
 *
 * @param userRole  Rol del usuario
 * @param permissions  Permisos especificos del usuario para la categoria (opcional)
 * @returns true si el usuario puede ver la categoria
 */
export function canViewCategory(
  userRole: UserRole,
  permissions?: CategoryPermissions | null
): boolean {
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }

  // Viewer necesita permiso explicito
  return permissions?.can_view ?? false;
}

/**
 * Verifica si el usuario puede crear transacciones en una categoria.
 *
 * - Admin puede crear en cualquier categoria.
 * - Manager puede crear en cualquier categoria.
 * - Viewer solo puede crear si tiene permiso explicito (can_create).
 *
 * @param userRole  Rol del usuario
 * @param permissions  Permisos especificos del usuario para la categoria (opcional)
 * @returns true si el usuario puede crear transacciones
 */
export function canCreateTransaction(
  userRole: UserRole,
  permissions?: CategoryPermissions | null
): boolean {
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }

  return permissions?.can_create ?? false;
}

/**
 * Verifica si el usuario puede editar una transaccion.
 *
 * - Admin puede editar cualquier transaccion.
 * - Manager puede editar cualquier transaccion de categorias a las que tiene acceso.
 * - Viewer solo puede editar sus propias transacciones si tiene permiso (can_edit).
 *
 * @param userRole  Rol del usuario
 * @param permissions  Permisos especificos del usuario para la categoria (opcional)
 * @param isOwner  true si el usuario es el creador de la transaccion
 * @returns true si el usuario puede editar la transaccion
 */
export function canEditTransaction(
  userRole: UserRole,
  permissions?: CategoryPermissions | null,
  isOwner: boolean = false
): boolean {
  if (userRole === 'admin') {
    return true;
  }

  if (userRole === 'manager') {
    return true;
  }

  // Viewer: solo sus propias transacciones y con permiso explicito
  if (userRole === 'viewer' && isOwner) {
    return permissions?.can_edit ?? false;
  }

  return false;
}

/**
 * Verifica si el usuario puede eliminar transacciones.
 *
 * Solo los administradores pueden eliminar transacciones.
 *
 * @param userRole  Rol del usuario
 * @returns true si el usuario puede eliminar transacciones
 */
export function canDeleteTransaction(userRole: UserRole): boolean {
  return userRole === 'admin';
}

/**
 * Verifica si el usuario puede gestionar otros usuarios.
 *
 * Solo los administradores pueden gestionar usuarios
 * (invitar, cambiar roles, desactivar).
 *
 * @param userRole  Rol del usuario
 * @returns true si el usuario puede gestionar usuarios
 */
export function canManageUsers(userRole: UserRole): boolean {
  return userRole === 'admin';
}
