// Packages
import electron from 'electron'
import { Component } from 'react'
import styled from 'styled-components'
import { Connect, query, mutation } from 'urql'
import debounce from 'just-debounce-it'
import v4 from 'uuid/v4'

// Utilities
import { closeWindowAndShowMain } from '../../../utils/windows/helpers'
import { User as UserFragment } from '../../../utils/graphql/fragments'

// Local
import gql from '../../../utils/graphql/gql'
import Input from '../../form/Input'
import Place from '../../../vectors/Place'
import Person from '../../../vectors/Person'
import AddPerson from '../../../vectors/AddPerson'
import PersonRow from './PersonRow'
import ListBtnRow from '../../ListBtnRow'
import NotificationBox from '../../NotificationBox'
import { StyledButton } from '../../Link'

class PersonSearch extends Component {
  state = {
    name: '',
    debouncedName: '',
    fetched: false,
  }

  render() {
    const { onManuallyClick, onPlaceClick } = this.props
    const { name, debouncedName, fetched } = this.state
    const shouldQuery = debouncedName.trim() && debouncedName.length > 2

    return (
      <Wrapper>
        <InputWrapper>
          <Input
            big={true}
            fullWidth={true}
            textAlign="left"
            iconComponent={Person}
            placeholder="By name or username"
            value={name}
            onChange={this.inputChanged}
          />
        </InputWrapper>

        <ListWrapper>
          <Connect
            query={shouldQuery && query(AllUsers, { name: debouncedName })}
            mutation={{
              followUser: mutation(FollowUser),
            }}
          >
            {({ data, followUser }) =>
              // Instantly hide the list if input was cleared
              name.trim() &&
              data &&
              data.allUsersByName &&
              data.allUsersByName.map(item => (
                <PersonRow
                  key={v4()}
                  onClick={() => this.userPicked(item, followUser)}
                  {...item}
                />
              ))
            }
          </Connect>

          <ListBtnRow
            iconComponent={AddPerson}
            title="Add Person manually instead"
            onClick={onManuallyClick}
          />

          <ListBtnRow
            iconComponent={Place}
            title="Add a Place"
            onClick={onPlaceClick}
          />
        </ListWrapper>

        <NotificationBox
          visible={fetched}
          onCloseClick={() => this.setState({ fetched: false })}
        >
          💫 Followed successfully!{' '}
          <StyledButton onClick={this.closeWindow}>Close Window</StyledButton>{' '}
          or continue!
        </NotificationBox>
      </Wrapper>
    )
  }

  inputChanged = e => {
    const name = e.target.value
    this.setState({ name })
    this.debouncedNameChanged(name)
  }

  debouncedNameChanged = debounce(name => {
    this.setState({ debouncedName: name })
  }, 250)

  userPicked = async (item, followUser) => {
    await followUser({ userId: item.id })

    const sender = electron.ipcRenderer || false

    if (!sender) {
      return false
    }
    // Refresh the main window to reflect the change
    sender.send('reload-main')
    this.setState({ fetched: true, name: '' })
  }

  closeWindow = () => {
    closeWindowAndShowMain()
  }
}

const AllUsers = gql`
  query($name: String!) {
    allUsersByName(name: $name, limit: 4) {
      id
      fullName
      firstName
      lastName
      twitterHandle
      photoUrl
      countryFlag
      city
    }
  }
`

const FollowUser = gql`
  mutation($userId: ID!) {
    followUser(userId: $userId) {
      ...User
    }
  }
  ${UserFragment}
`

export default PersonSearch

const ListWrapper = styled.div`
  flex: 1 1 auto;
  padding-top: 10px;
  overflow: auto;
  margin: 0 ${p => -p.theme.sizes.sidePaddingLarge}px;
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const InputWrapper = styled.div`
  flex: 0 1 auto;
`
