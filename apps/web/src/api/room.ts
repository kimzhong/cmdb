import { http } from './client';

export const roomApi = {
  listRooms: () => http.get('/rooms'),
  getRoom: (id: string) => http.get(`/rooms/${id}`),
  createRoom: (dto: any) => http.post('/rooms', dto),
  listCabinets: (roomId: string) => http.get(`/rooms/${roomId}/cabinets`),
  createCabinet: (roomId: string, dto: any) => http.post(`/rooms/${roomId}/cabinets`, dto),
  getCabinet: (id: string) => http.get(`/cabinets/${id}`),
  listUnits: (cabinetId: string) => http.get(`/cabinets/${cabinetId}/units`),
  allocateUnit: (cabinetId: string, dto: { startU: number; heightU: number; resourceId: string }) =>
    http.post(`/cabinets/${cabinetId}/allocate`, dto),
  deallocateUnit: (cabinetId: string, dto: { startU: number }) =>
    http.post(`/cabinets/${cabinetId}/deallocate`, dto),
};
