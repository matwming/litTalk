import mitt from 'mitt';
const emitter = mitt();

// Define event types for better type safety
export const EventTypes = {
  TOKEN_READY: 'token_ready',
  COMMENT_ADDED: 'comment_added',
};

export {emitter};
