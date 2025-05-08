export const groupChatSchema = {
    value: {
        required: ['activity', 'object'],
        properties: {
            activity: {
                type: 'string',
                const: 'Create'
            },
            object: {
                required: ['type', 'name', 'channel'],
                properties: {
                    type: {
                        type: 'string',
                        const: 'Group Chat'
                    },
                    name: {
                        type: 'string'
                    },
                    channel: {
                        type: 'string'
                    },
                    category: {
                        type: 'string',
                        enum: ['Critical ⚠️', 'Inbox', 'Ignore 😴', 'Handled 🤖'],
                        default: 'Inbox'
                    }
                }
            }
        }
    }
};

export const categoryMappingSchema = {
    value: {
        required: ['chatChannel', 'category'],
        properties: {
            chatChannel: {
                type: 'string'
            },
            category: {
                type: 'string',
                enum: ['Critical ⚠️', 'Inbox', 'Ignore 😴', 'Handled 🤖']
            }
        }
    }
}; 