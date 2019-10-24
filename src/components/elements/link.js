import styled, { css } from 'styled-components'
import { LocalizedLink } from '../localization'

const StyledLink = styled(LocalizedLink)`
    font-size: var(--text-size-sm);
    color: var(--color-red);
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }

    ${props => {
        if (props.has_arrow)
            return css`
                &::before {
                    content: '<';
                    display: inline-block;
                    margin-right: 0.4rem;
                    font-weight: 300;
                    text-decoration: none;
                }
            `
    }}
`

export default StyledLink
