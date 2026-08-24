import {announcement} from './documents/announcement'
import {attendance} from './documents/attendance'
import {category} from './documents/category'
import {comment} from './documents/comment'
import {follow} from './documents/follow'
import {memory} from './documents/memory'
import {notification} from './documents/notification'
import {organisation} from './documents/organisation'
import {pushSubscription} from './documents/pushSubscription'
import {report} from './documents/report'
import {user} from './documents/user'
import {bus} from './objects/bus'

export const schemaTypes = [
  // Editorial
  announcement,
  organisation,
  category,
  user,
  // User-generated
  attendance,
  comment,
  memory,
  report,
  follow,
  // System — written by the notification engine, never by hand
  notification,
  pushSubscription,
  // Objects
  bus,
]
