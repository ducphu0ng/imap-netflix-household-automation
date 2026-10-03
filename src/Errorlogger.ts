const timestamp = () => new Intl.DateTimeFormat('default', {
  dateStyle: 'full',
  timeStyle: 'long',
}).format(new Date());

export function logInfo(message: string) {
  console.log(`${timestamp()} | ${message}`);
}

export default class Errorlogger extends Error {
  constructor(error: any) {
    console.log(super(`${timestamp()} | ${error?.message ?? error}`));
  }
}
