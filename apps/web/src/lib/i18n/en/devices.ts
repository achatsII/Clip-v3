import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Your company uses {app}',
    body: 'This account belongs to a company that works with {app}: its instructions and stations are waiting for you there.',
    open: 'Open {app}',
    install: 'Install {app}',
    noStore: 'Your company’s team will give you the link to the {app} app.',
    computer: 'On a computer: {host}',
  },
  getApp: {
    title: 'CLIP on your phone',
    why: 'Film the task at the station and open instructions from their QR code.',
    scan: 'Point your phone’s camera at this code: it opens the App Store or Google Play.',
    ask: 'No link for this phone? Your company’s team will give it to you.',
    menu: 'Mobile app',
    later: 'Later',
    pageTitle: 'Install CLIP',
    pageBack: 'Continue in the browser',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'On your computer',
    body: 'Work on a big screen: open {host} in your browser and sign in with the same account.',
    copy: 'Copy the address',
    copied: 'Address copied',
    send: 'Send the link',
    later: 'Later',
  },
}
