const electron = require('electron');
const path = require('path');
const url = require('url');
const { dialog, app, ipcMain, BrowserWindow } = electron
const os = require('os');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

const { autoUpdater } = require('electron-updater');
const isMac = os.platform() === 'darwin' ? true : false;
const StoreElectron = new Store();
let mainWindow;
let windows_list = new Map();

//-- start checking: Prevent more than one instance of electron
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
//-- end checking: Prevent more than one instance of electron

function createWindow() {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    backgroundColor: '#2e2c29',
    // alwaysOnTop: true,
    frame: true,
    autoHideMenuBar: true,
    fullscreenable: true,
    // transparent: true,
    // titleBarStyle: 'customButtonsOnHover',
    show: false,
    width: width,
    height: height,
    // minWidth: 512,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      allowRendererProcessReuse: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../index.html'),
    protocol: 'file:',
    slashes: true,
  });

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {

    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    let code = `var loading = document.getElementById("loader");
                        if (loading) loading.classList.remove('loader');`;
    mainWindow.webContents.executeJavaScript(code);
  })

  ipcMain.on('update_window', () => {
    console.log('update_window ipcMain')
    autoUpdater.checkForUpdatesAndNotify()
    // autoUpdater.checkForUpdates()

  })

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update_available');
  });
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded');
  });

  autoUpdater.on('download-progress', (event, args) => {
    mainWindow.webContents.send('download_progress', { event, args });
  });

  ipcMain.on('restart_app', (event, agrs) => {
    if (agrs.install) {
      autoUpdater.quitAndInstall();
    } else {
      app.relaunch()
      app.exit()
    }
  });
  // mainWindow.once('show', () => {
  //   mainWindow.webContents.send('todos')
  //   // console.log(mainWindow.webContents)
  // })

  // mainWindow.webContents.on('dom-ready', () => {
  //   mainWindow.webContents.send('readConfigInfo')
  // })


  // send after read config
  ipcMain.on('done_read_config', (event) => {
    event.reply("done_read_config")
  })

  // open main window
  ipcMain.on('open_main_window', (event) => {
    mainWindow.show()
  })

  // open_config_info
  ipcMain.on('open_config_info', (event) => {
    mainWindow.send('open_config_info')
  })

  // get latest value from glv_sv
  ipcMain.on('get_value_from_glb_sv', (event, agrs) => {
    mainWindow.send("get_value_from_glb_sv", agrs)
  })

  // get latest value from glv_sv
  ipcMain.on('reply_get_value_from_glb_sv', (event, agrs) => {
    if (!windows_list.get(agrs.component)) { event.reply(`reply_get_value_from_glb_sv_${agrs.component}_${agrs.sq}`, agrs.value) }
    else windows_list.get(agrs.component).send(`reply_get_value_from_glb_sv_${agrs.component}_${agrs.sq}`, agrs.value)
  })

  // update value for glv_sv
  ipcMain.on('update_value_for_glb_sv', (event, agrs) => {
    mainWindow.send("update_value_for_glb_sv", agrs)
  })

  // get latest socket_sv from App.js
  ipcMain.on('get_socket_sv', (event, agrs) => {
    mainWindow.send("get_socket_sv", agrs)
  })

  // get latest socket_sv from App.js
  ipcMain.on('open_modal_register', () => {
    mainWindow.send("open_modal_register")
  })

  // reply to return the latest socket_sv for the requested component
  ipcMain.on('reply_get_socket_sv', (event, agrs) => {
    if (!windows_list.get(agrs.component)) { event.reply(`reply_get_socket_sv_${agrs.component}_${agrs.sq}`, agrs.socket_sv) }
    else windows_list.get(agrs.component).send(`reply_get_socket_sv_${agrs.component}_${agrs.sq}`, agrs.socket_sv)
    // mainWindow.send("get_socket_sv", agrs)
  })

  // get latest glb_sv from App.js
  ipcMain.on('get_glb_sv', (event, agrs) => {
    mainWindow.send("get_glb_sv", agrs)
  })

  // reply to return the latest glb_sv for the requested component
  ipcMain.on('reply_get_glb_sv', (event, agrs) => {
    if (!windows_list.get(agrs.component)) { event.reply(`reply_get_glb_sv_${agrs.component}_${agrs.sq}`, agrs.glb_sv) }
    else windows_list.get(agrs.component).send(`reply_get_glb_sv_${agrs.component}_${agrs.sq}`, agrs.glb_sv)
    // mainWindow.send("get_socket_sv", agrs)
  })

  // get latest glb_sv and socket_sv from App.js
  ipcMain.on('get_socket_n_glb_sv', (event, agrs) => {
    mainWindow.send("get_socket_n_glb_sv", agrs)
  })

  // reply to return the latest glb_sv for the requested component
  ipcMain.on('reply_get_socket_n_glb_sv', (event, agrs) => {
    if (!windows_list.get(agrs.component)) {
      event.reply(`reply_get_socket_n_glb_sv_${agrs.component}_${agrs.sq}`,
        { glb_sv: agrs.glb_sv, socket_sv: agrs.socket_sv }
      )
    }
    else windows_list.get(agrs.component).send(`reply_get_socket_n_glb_sv_${agrs.component}_${agrs.sq}`,
      { glb_sv: agrs.glb_sv, socket_sv: agrs.socket_sv })
    // mainWindow.send("get_socket_sv", agrs)
  })

  // inform for app.js know that is the stkTradEvent broadcast service
  ipcMain.on('Inform_stkTradEvent_Broadcast', (event, agrs) => {
    mainWindow.send("Inform_stkTradEvent_Broadcast", agrs)
  })

  // send stkTradEvent broadcast for all components in all windows
  ipcMain.on('Send_stkTradEvent_Broadcast', (event, agrs) => {
    const a = agrs
    for (let i = 0; i < a.active_components.length; i++) {
      for (let value of windows_list.values()) {
        value.send(`${'stkTradEvent'}_${a.channel}_${a.active_components[i]}`, a.param)
      }
      // console.log(`${a.channel}_${a.active_components[i]}`)
      mainWindow.send(`${'stkTradEvent'}_${a.channel}_${a.active_components[i]}`, a.param)
    }
  })

  // inform for app.js know that is the broadcast service
  ipcMain.on('Inform_Broadcast', (event, agrs) => {
    mainWindow.send("Inform_Broadcast", agrs)
  })

  // send broadcast for all components in all windows
  ipcMain.on('Send_Broadcast', (event, agrs) => {
    for (let i = 0; i < agrs.active_components.length; i++) {
      for (let value of windows_list.values()) {
        value.send(`${agrs.channel}_${agrs.active_components[i]}`, agrs.param)
      }
      // console.log(`${a.channel}_${a.active_components[i]}`)
      mainWindow.send(`${agrs.channel}_${agrs.active_components[i]}`, agrs.param)
    }

  })

  // get the active tab
  ipcMain.on('active_tab', (event, agrs) => {
    const active_component = windows_list.get(agrs);
    if (active_component) {
      active_component.show()
    } else event.reply("active_tab", agrs)
  })

  // SubMarketInfor
  ipcMain.on('SubMarketInfor', (event, agrs) => {
    if (!windows_list.get(agrs.component)) {
      event.reply(`SubMarketInfor_${agrs.component}`, agrs)
      // console.log('main')
    }
    else {
      console.log(`SubMarketInfor_${agrs.component}`)
      windows_list.get(agrs.component).send(`SubMarketInfor_${agrs.component}`, agrs)
    }
  })

  // send enable the button in menu bar
  ipcMain.on('enable', (event, agrs) => {
    event.reply("enable", agrs)
  })

  // send disable the button in menu bar
  ipcMain.on('disable', (event, agrs) => {
    event.reply("disable", agrs)
  })

  ipcMain.on('bf_popin_window', (event, agrs) => {
    event.reply(`bf_popin_window_${agrs}`)
  })

  ipcMain.on('popin_window', (event, agrs) => {
    // console.log("send popin", agrs)
    // console.log("popin_window", agrs)
    mainWindow.send('popin_window', agrs)
    mainWindow.send(`${agrs.component}`, { state: agrs.state })

  })

  ipcMain.on('send_req', (event, agrs) => {
    mainWindow.send('send_req', agrs)
  })

  ipcMain.on('on_subcribeIndex', (event, agrs) => {
    mainWindow.send('on_subcribeIndex', agrs)
  })

  ipcMain.on('on_subcribeIndexAll', (event, agrs) => {
    mainWindow.send('on_subcribeIndexAll', agrs)
  })

  ipcMain.on('on_subcribeIndexList', (event, agrs) => {
    mainWindow.send('on_subcribeIndexList', agrs)
  })

  ipcMain.on('on_subcribeListCont', (event, agrs) => {
    mainWindow.send('on_subcribeListCont', agrs)
  })

  ipcMain.on('on_subcribeOneStkFVLt', (event, agrs) => {
    mainWindow.send('on_subcribeOneStkFVLt', agrs)
  })

  ipcMain.on('on_unSubcribeFVL', (event, agrs) => {
    mainWindow.send('on_unSubcribeFVL', agrs)
  })

  ipcMain.on('on_unSubStkList', (event, agrs) => {
    mainWindow.send('on_unSubStkList', agrs)
  })

  ipcMain.on('on_unsubcribeIndex', (event, agrs) => {
    mainWindow.send('on_unsubcribeIndex', agrs)
  })

  ipcMain.on('on_subcribeMrk', (event, agrs) => {
    mainWindow.send('on_subcribeMrk', agrs)
  })

  ipcMain.on('on_unsubcribeMrk', (event, agrs) => {
    mainWindow.send('on_unsubcribeMrk', agrs)
  })

  ipcMain.on('reply_send_req', (event, agrs) => {
    if (!windows_list.get(agrs.req_component.component)) {
      event.reply(`reply_send_req_${agrs.req_component.component}`, agrs)
    }
    else {
      windows_list.get(agrs.req_component.component).send(`reply_send_req_${agrs.req_component.component}`, agrs)
    }
  })

  ipcMain.on('reply_send_event_FinishSunbcribeFunct', (event, agrs) => {
    if (!windows_list.get(agrs.component)) { event.reply(`reply_send_event_FinishSunbcribeFunct_${agrs.component}`, agrs.value) }
    else windows_list.get(agrs.component).send(`reply_send_event_FinishSunbcribeFunct_${agrs.component}`, agrs.value)
  })

  // before popout window
  ipcMain.on("bf_popout", (event, agrs) => {
    event.reply(`bf_popout_${agrs}`)
  })

  //update_state before popout window 
  ipcMain.on("update_state_bf_popout", (event, agrs) => {
    event.reply('update_state_bf_popout', agrs)
  })

  ipcMain.on('open_OVERVIEW_MARKET_TAB_layout', (event, agrs) => {
    mainWindow.send('open_OVERVIEW_MARKET_TAB_layout', agrs)
  })

  ipcMain.on('open_layout_from_component', (event, agrs) => {
    mainWindow.show()
    mainWindow.send('open_layout_from_component', agrs)
  })

  ipcMain.on('popout', (event, agrs) => {
    const item = agrs
    const popout_window = new BrowserWindow({
      // alwaysOnTop: true,,
      backgroundColor: '#2e2c29',
      frame: true,
      autoHideMenuBar: true,
      fullscreenable: true,
      // transparent: true,
      // titleBarStyle: 'customButtonsOnHover',
      show: false,
      width: 1024,
      height: 768,
      // minWidth: 512,
      webPreferences: {
        nodeIntegration: true,
        nativeWindowOpen: true,
        webSecurity: false,
        allowRendererProcessReuse: true,
        preload: path.join(__dirname, 'preload.js'),
      }
    });
    mainWindow.send("active_component", item.component)

    windows_list.set(item.component, popout_window)

    // const component = `../build/index.html#${agrs.component}`
    // popout_window.loadURL(isDev ? `http://localhost:3000/${item.component}___${item.key}` :
    //   `file://${path.join(__dirname, `../build/index.html#${item.component}___${item.key}`)}`);

    const startUrl = process.env.ELECTRON_START_URL || url.format({
      pathname: path.join(__dirname, `../index.html#${item.component}___${item.key}`),
      protocol: 'file:',
      slashes: true,
    });

    popout_window.loadURL(startUrl);
    popout_window.show()


    popout_window.webContents.on('did-finish-load', () => {
      // Open the DevTools automatically if developing

      const item = agrs
      let code = `var loading = document.getElementById("loader");
      if (loading)   loading.classList.remove('loader');`;
      popout_window.webContents.executeJavaScript(code);
      popout_window.show();


      popout_window.send("update_state_af_popout",
        { state: item.state, parent_id: item.parent_id, config: item.config })


      if (isDev) {
        popout_window.webContents.openDevTools();
        console.log('show')

      }
    })
    // popout_window.once('ready-to-show', () => {

    // })

    popout_window.on('close', () => {
      // windows_list.splice(windows_list.indexOf(popout_window), 1)
      // console.log(agrs.component)
      const item = agrs
      windows_list.delete(item.component)
      mainWindow.send("active_component_close", item.component)
      mainWindow.send("on_unSubStkList", { component: item.component })
      mainWindow.send("on_unsubcribeIndex", { arr: [], component: item.component })
      // mainWindow.send(commuChanel.SubMarketInfor, {node: agrs.state.node, key: agrs.state.key, component: agrs.component})

      // console.log(agrs)
      mainWindow.send("enable", item.config)
      // console.log(agrs.parent_id)
      // popout_window.send("close_window", agrs.parent_id)
    })


  })

  // mainWindow.on('closed', () => mainWindow = null);
  // mainWindow.on('close', function (e) {
  //   const lange = StoreElectron.get('lngUser');
  //   let message_ne = 'Bạn có thực sự muốn thoát chương trình?', message_ok = 'Có', message_no = 'Không';

  //   if (lange === 'EN') {
  //     message_ne = 'Are you sure you want to quit?'
  //     message_ok = 'Yes'
  //     message_no = 'No'
  //   }
  //   else if (lange === 'CN') {
  //     message_ne = '你确定你要退出吗?'
  //     message_ok = '是'
  //     message_no = '没有'
  //   }
  //   else if (lange === 'ZH') {
  //     message_ne = '你确定你要退出吗?'
  //     message_ok = '是'
  //     message_no = '没有'
  //   }
  //   else if (lange === 'KO') {
  //     message_ne = '종료 하시겠습니까?'
  //     message_ok = '예'
  //     message_no = '아니'
  //   }
  //   const choice = require('electron').dialog.showMessageBoxSync(this,
  //     {
  //       type: 'question',
  //       buttons: [message_no, message_ok],
  //       title: '',
  //       message: message_ne
  //     });
  //   if (choice === 0) {
  //     e.preventDefault();
  //   }
  // });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});