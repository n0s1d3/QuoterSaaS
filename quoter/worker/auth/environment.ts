export interface EmailEnvironment { EMAIL_MODE?: string; RESEND_API_KEY?: string; MAIL_FROM?: string; APP_URL?: string }
export function localPreview(request:Request,env:EmailEnvironment) {return env.EMAIL_MODE==='preview'&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname)}
