export const ACCESS_TOKEN_KEY = 'access_token'
export const TOKEN_TYPE_KEY = 'token_type'
export const REFRESH_TOKEN_KEY = 'refresh_token'

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

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

export const setAuthTokens = ({
    accessToken,
    tokenType,
    refreshToken,
}: {
    accessToken?: string
    tokenType?: string
    refreshToken?: string
}) => {
    if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    }

    if (tokenType) {
        localStorage.setItem(TOKEN_TYPE_KEY, tokenType)
    }

    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
}

export const clearAuthTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(TOKEN_TYPE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
}

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
