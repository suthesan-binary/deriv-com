import React from 'react'
import {
    getClientInformation,
    getDomain,
    getUTMData,
    isBrowser,
    livechat_client_id,
    livechat_license_id,
} from 'common/utility'

export const useLivechat = () => {
    const [is_livechat_interactive, setLiveChatInteractive] = React.useState(false)
    const LC_API = (isBrowser() && window.LC_API) || {}
    const [is_logged_in, setLoggedIn] = React.useState(false)
    const CustomerSdk = React.useRef(null)

    const url_params = new URLSearchParams((isBrowser() && window.location.search) || '')
    const is_livechat_query = url_params.get('is_livechat_open')

    const loadLiveChatScript = (callback) => {
        const livechat_script = document.createElement('script')
        livechat_script.innerHTML = `
            window.__lc = window.__lc || {};
            window.__lc.license = 12049137;
            ;(function(n,t,c){function i(n){return e._h?e._h.apply(null,n):e._q.push(n)}var e={_q:[],_h:null,_v:"2.0",on:function(){i(["on",c.call(arguments)])},once:function(){i(["once",c.call(arguments)])},off:function(){i(["off",c.call(arguments)])},get:function(){if(!e._h)throw new Error("[LiveChatWidget] You can’t use getters before load.");return i(["get",c.call(arguments)])},call:function(){i(["call",c.call(arguments)])},init:function(){var n=t.createElement("script");n.async=!0,n.type="text/javascript",n.src="https://cdn.livechatinc.com/tracking.js",t.head.appendChild(n)}};!n.__lc.asyncInit&&e.init(),n.LiveChatWidget=n.LiveChatWidget||e}(window,document,[].slice))
        `
        document.body.appendChild(livechat_script)
        if (callback) callback()
    }

    React.useEffect(() => {
        let cookie_interval = null
        let script_timeout = null
        if (isBrowser()) {
            const domain = getDomain()
            try {
                import('@livechat/customer-sdk').then((CSDK) => {
                    CustomerSdk.current = CSDK
                })
            } catch (e) {
                //eslint-disable-no-empty
            }

            /* this function runs every second to determine logged in status*/
            const checkCookie = (() => {
                return function () {
                    const client_information = getClientInformation(domain)
                    setLoggedIn(!!client_information)
                }
            })()
            cookie_interval = setInterval(checkCookie, 1000)

            // The purpose is to load the script after everything is load but not async or defer. Therefore, it will be ignored in the rendering timeline
            script_timeout = setTimeout(() => {
                loadLiveChatScript(() => {
                    window.LiveChatWidget.on('ready', () => {
                        setLiveChatInteractive(true)
                        if (is_livechat_query?.toLowerCase() === 'true') {
                            window.LC_API.open_chat_window()
                        }
                    })
                })
            }, 2000)
        }

        return () => {
            clearInterval(cookie_interval)
            clearTimeout(script_timeout)
        }
    }, [])

    React.useEffect(() => {
        if (isBrowser()) {
            let customerSDK = null
            const domain = getDomain()
            if (CustomerSdk.current) {
                try {
                    customerSDK = CustomerSdk.current.init({
                        licenseId: livechat_license_id,
                        clientId: livechat_client_id,
                    })
                } catch (e) {
                    // eslint-disable-no-empty
                }
            }
            if (is_livechat_interactive) {
                window.LiveChatWidget.on('ready', () => {
                    if (is_logged_in) {
                        const client_information = getClientInformation(domain)
                        const utm_data = getUTMData(domain) || {}
                        const {
                            loginid,
                            email,
                            landing_company_shortcode,
                            currency,
                            residence,
                            first_name,
                            last_name,
                        } = (client_information) || {};
                        const {
                            utm_source,
                            utm_medium,
                            utm_campaign,
                        } = (utm_data) || {};

                        /* the session variables are sent to CS team dashboard to notify user has logged in
                        and also acts as custom variables to trigger targeted engagement */
                        const session_variables = {
                            is_logged_in: is_logged_in,
                            loginid: loginid ?? '',
                            landing_company_shortcode: landing_company_shortcode ?? '',
                            currency: currency ?? '',
                            residence: residence ?? '',
                            email: email ?? '',
                            utm_source: utm_source ?? '',
                            utm_medium: utm_medium ?? '',
                            utm_campaign: utm_campaign ?? '',
                        }

                        window.LiveChatWidget.call('set_session_variables', session_variables)
                        if (email) {
                            window.LiveChatWidget.call('set_customer_email', email)
                        }
                        if (first_name && last_name) {
                            window.LiveChatWidget.call(
                                'set_customer_name',
                                `${first_name} ${last_name}`,
                            )
                        }
                    } else {
                        window.LiveChatWidget.call('set_session_variables', '')
                        const chat_id = window.LiveChatWidget.get('chat_data').chatId
                        if (chat_id) {
                            if (customerSDK) {
                                customerSDK.on('connected', () => {
                                    customerSDK?.deactivateChat({ chatId: chat_id }).catch(() => {
                                    })
                                })
                            }
                        }

                        window.LiveChatWidget.call('set_customer_email', ' ')
                        window.LiveChatWidget.call('set_customer_name', ' ')
                    }

                    const url_params = new URLSearchParams(window.location.search)
                    const is_livechat_query = url_params.get('is_livechat_open')
                    if (is_livechat_query?.toLowerCase() === 'true') {
                        window.LC_API.open_chat_window()
                    }
                })
            }
        }
    }, [is_logged_in, CustomerSdk, is_livechat_interactive])

    return [is_livechat_interactive, LC_API]
}
