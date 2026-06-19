import { useEffect, useState } from 'react'
import { apiRequest } from '../api'

export function useTeamUsers(roleCode, subDirectorateId, serviceId) {
  const [users, setUsers] = useState([])

  useEffect(() => {
    const query = new URLSearchParams()
    if (roleCode) query.set('role_code', roleCode)
    if (subDirectorateId) query.set('sub_directorate_id', String(subDirectorateId))
    if (serviceId) query.set('service_id', String(serviceId))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    const onlineSuffix = suffix ? `${suffix}&include_online=1` : '?include_online=1'

    apiRequest(`/meta/users${onlineSuffix}`)
      .then((data) => setUsers(data.users || []))
      .catch(() => setUsers([]))
  }, [roleCode, subDirectorateId, serviceId])

  return users
}
