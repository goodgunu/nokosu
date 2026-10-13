export type PhotoJob = {
  done: number;
  total: number;
  label: string;
};

const listeners = new Set<() => void>();
const jobs = new Map<string, PhotoJob>();
let version = 0;

export function subscribePhotoJobs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPhotoJob(id: string): PhotoJob | undefined {
  return jobs.get(id);
}

export function photoDataVersion(): number {
  return version;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function startPhotoJob(id: string, total: number) {
  jobs.set(id, { done: 0, total, label: "写真を集めています" });
  emit();
}

export function updatePhotoJob(id: string, done: number, total: number, label: string) {
  jobs.set(id, { done, total, label });
  emit();
}

export function finishPhotoJob(id: string) {
  if (!jobs.has(id)) return;
  jobs.delete(id);
  version += 1;
  emit();
}
