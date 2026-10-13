import { useContext } from 'react';
import { ServicesContext } from '../../application/ServicesContext';

export function useApplicationServices() {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('Application services must be injected by ServicesProvider.');
  return services;
}
