export const ACCESS_TOKEN_KEY = 'access_token'
export const TOKEN_TYPE_KEY = 'token_type'

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
    unauthorizedHandler = handler
}

export const handleUnauthorized = () => {
    unauthorizedHandler?.()
}

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)

export const getTokenType = () => localStorage.getItem(TOKEN_TYPE_KEY)

export const getAuthorizationHeader = () => {
    const token = getAccessToken()
    const tokenType = getTokenType() ?? 'bearer'

    if (!token) {
        return {}
    }

    return {
        Authorization: `${tokenType} ${token}`,
    }
}

export const withAuthorization = (headers: HeadersInit = {}) => ({
    ...headers,
    ...getAuthorizationHeader(),
})
