import { orderBy } from 'lodash-es'

import { rrcsMethods } from './methods.js'
import { rrcsErrorCodes } from './errorcodes.js'

export async function getAllLogicSources() {
	return await this.rrcsQueue.add(async () => {
		const logicSources = await this.rrcsMethodCall(rrcsMethods.logic.getAllSourcesV2.rpc, [])
		if (logicSources === undefined) {
			return
		}
		if (this.config.verbose) {
			this.log('debug', `getAllLogicSources: \n${JSON.stringify(logicSources)}`)
		}
		if (logicSources[`ErrorCode`] !== 0) {
			this.log('warn', `getAllLogicSources: ${rrcsErrorCodes[logicSources.ErrorCode]}`)
			return undefined
		}
		this.rrcs.choices.logicSources = []
		if (logicSources[`LogicSourceCount`] > 0) {
			for (let i = 1; i <= logicSources[`LogicSourceCount`]; i++) {
				const logicSource = logicSources[`LogicSource#${i}`]
				if (Array.isArray(logicSource) && logicSource.length === 4) {
					this.rrcs.logicSrc[logicSource[2]] = {
						name: logicSource[0],
						alias: logicSource[1],
						ObjectID: logicSource[2],
						state: !!logicSource[3],
					}
					this.rrcs.choices.logicSources.push({ id: logicSource[2], label: logicSource[0] })
				}
			}
			this.rrcs.choices.logicSources = orderBy(this.rrcs.choices.logicSources, ['label'], ['asc'])
		}
		this.debounceUpdateActionFeedbackDefs()
		if (this.feedbacksToUpdate.includes('logicSource') === false) {
			this.feedbacksToUpdate.push('logicSource')
		}
		return logicSources
	})
}

export async function setLogicSource(ObjectID, state) {
	return await this.rrcsQueue.add(async () => {
		const logicSource = await this.rrcsMethodCall(rrcsMethods.logic.setSource.rpc, [ObjectID, !!state])
		if (logicSource === undefined) {
			return
		}
		if (this.config.verbose) {
			this.log('debug', `setLogicSource: \n${JSON.stringify(logicSource)}`)
		}
		if (logicSource[1] !== 0) {
			this.log('warn', `setLogicSource: ${rrcsErrorCodes[logicSource.ErrorCode]}`)
			return undefined
		} else {
			this.addLogicSource(ObjectID, state)
		}
		return logicSource
	})
}

export function addLogicSource(ObjectID, state) {
	this.rrcs.logicSrc[ObjectID].state = !!state
	if (this.feedbacksToUpdate.includes('logicSource') === false) {
		this.feedbacksToUpdate.push('logicSource')
	}
	if (this.isRecordingActions) {
		this.recordAction(
			{
				actionId: 'setLogicSource',
				options: { logicSrc: ObjectID, logicState: !!state },
			},
			`setLogicSource ${ObjectID}`,
		)
	}
}
