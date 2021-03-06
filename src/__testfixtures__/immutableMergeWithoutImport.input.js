/**
 * Created by Balthazar on 7/23/16.
 */
import { asImmutable } from '../../../../in-util';

/**
 * Reducers
 */

const initialState = asImmutable({
  notification: {
    content: '',
    type: '',
    visible: false
  }
});

export const createNotificationReducer = actions => (state = initialState, action) => {
  switch (action.type) {
    case actions.NOTIFICATION_DISPLAYED:
      return state.mergeDeep({
        notification: {
          ...action.payload,
          visible: true
        }
      });
    case actions.NOTIFICATION_TYPE_CHANGED:
      return state.mergeIn(['notification', 'type'], action.payload);
    case actions.NOTIFICATION_TEXT_APPENDED:
      return state.getIn(['notification', 'text']).mergeDeepWith((oldVal, newVal) => `${oldVal} ${newVal}`, action.payload);
    case actions.NOTIFICATION_TEXT_CHANGED:
      return state.get('notification').merge(action.payload);
    case actions.NOTIFICATION_COLLAPSED:
      return state.setIn(['notification', 'visible'], false);
    default:
      return state;
  }
};
