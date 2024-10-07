import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { FullState, ToolState } from '../window/state'

const initialState: ToolState = {
    openLeftTab: 'filetree',
    leftTabActive: false,
    fileSearchTriggered: false,
    commandPaletteTriggered: false,
    aiCommandPaletteTriggered: false,
    leftSideExpanded: true,
    ravionaiLogin: {},
}
const untriggerAll = (state: ToolState) => {
    state.fileSearchTriggered = false
    state.commandPaletteTriggered = false
    // leftSideExpanded: true
    state.aiCommandPaletteTriggered = false
}

export const refreshLoginDetails = createAsyncThunk(
    'tool/refreshLoginDetails',
    async (arg: null, { dispatch }) => {
        const newUserCreds = await connector.getUserCreds()
        dispatch(login(newUserCreds))
        console.log('FINISHED REFRESH LOGIN HERE')
    }
)

export const signInravionai = createAsyncThunk(
    'tool/signIn',
    async (payload: null, { dispatch, getState }) => {
        await dispatch(refreshLoginDetails(null))
        const state = (getState() as FullState).toolState

        console.log('CALLING SIGN IN ravionai')
        if (state.ravionaiLogin.accessToken && state.ravionaiLogin.profile) {
            return
        } else {
            console.log('CALL PASSES TO LOGIN ravionai')
            await connector.loginravionai()
        }
    }
)

export const signOutravionai = createAsyncThunk(
    'tool/signOut',
    async (payload: null, { dispatch, getState }) => {
        await dispatch(refreshLoginDetails(null))
        const state = (getState() as FullState).toolState

        console.log('CALLING SIGN OUT ravionai')
        if (state.ravionaiLogin.accessToken && state.ravionaiLogin.profile) {
            console.log('CALL PASSES TO LOGOUT ravionai')
            await connector.logoutravionai()
        } else {
            return
        }
    }
)

export const upgraderavionai = createAsyncThunk(
    'tool/upgrade',
    async (payload: null, { dispatch, getState }) => {
        await dispatch(refreshLoginDetails(null))
        const state = (getState() as FullState).toolState
        console.log('FINISHED REFRESH LOGIN OUTSIDE')
        console.log('CALLING UPGRADE ravionai')
        if (
            state.ravionaiLogin.accessToken &&
            state.ravionaiLogin.profile &&
            state.ravionaiLogin.stripeId
        ) {
            return
        } else if (
            !(state.ravionaiLogin.accessToken && state.ravionaiLogin.profile)
        ) {
            console.log('UPGRADE ravionai PASSES TO LOGIN')
            await connector.loginravionai()
        } else {
            console.log('UPGRADE ravionai PASSES TO PAY')
            await connector.payravionai()
        }
    }
)

export const toolSlice = createSlice({
    name: 'toolState',
    initialState: initialState as ToolState,
    reducers: {
        openSearch: (state: ToolState) => {
            untriggerAll(state)
            state.openLeftTab = 'search'
            state.leftTabActive = true
        },
        openFileTree: (state: ToolState) => {
            untriggerAll(state)
            state.openLeftTab = 'filetree'
            state.leftTabActive = true
        },
        leftTabInactive: (state: ToolState) => {
            state.leftTabActive = false
        },
        triggerFileSearch: (state: ToolState) => {
            untriggerAll(state)
            state.fileSearchTriggered = true
        },
        untriggerFileSearch: (state: ToolState) => {
            untriggerAll(state)
        },

        triggerCommandPalette: (state: ToolState) => {
            untriggerAll(state)
            state.commandPaletteTriggered = true
        },
        triggerAICommandPalette: (state: ToolState) => {
            const newAICommandPaletteTriggered = !state.aiCommandPaletteTriggered
            untriggerAll(state)
            state.aiCommandPaletteTriggered = newAICommandPaletteTriggered
        },
        untriggerAICommandPalette: (state: ToolState) => {
            untriggerAll(state)
        },
        untriggerCommandPalette: (state: ToolState) => {
            untriggerAll(state)
        },
        collapseLeftSide: (state: ToolState) => {
            state.leftSideExpanded = false
        },
        expandLeftSide: (state: ToolState) => {
            state.leftSideExpanded = true
        },
        toggleLeftSide: (state: ToolState) => {
            state.leftSideExpanded = !state.leftSideExpanded
        },
        login(
            state: ToolState,
            action: PayloadAction<{
                accessToken?: string | null
                profile?: any | null
                stripeProfile?: string | null
            }>
        ) {
            console.log('Triggered with', action.payload)
            if (action.payload.accessToken) {
                state.ravionaiLogin.accessToken = action.payload.accessToken
            } else if (action.payload.accessToken === null) {
                state.ravionaiLogin.accessToken = undefined
            }

            if (action.payload.profile) {
                state.ravionaiLogin.profile = action.payload.profile
            } else if (action.payload.profile === null) {
                state.ravionaiLogin.profile = undefined
            }

            // Should name these the same thing
            if (action.payload.stripeProfile) {
                state.ravionaiLogin.stripeId = action.payload.stripeProfile
            } else if (action.payload.stripeProfile === null) {
                state.ravionaiLogin.stripeId = undefined
            }
        },
    },
})

export const {
    openSearch,
    openFileTree,
    leftTabInactive,
    triggerFileSearch,
    untriggerFileSearch,
    triggerCommandPalette,
    untriggerCommandPalette,
    triggerAICommandPalette,
    untriggerAICommandPalette,
    collapseLeftSide,
    expandLeftSide,
    toggleLeftSide,
    login,
} = toolSlice.actions
