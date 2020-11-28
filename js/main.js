let peerId = null;
let peer = null

let localStream = null;
let remoteStream = null;

let isMuteMyLocalStream = false
let call = null


/**
 * Отклонить звонок
 * @param {*} newCall 
 */
const declineAnswer = async (newCall) => {

    const anotherPeerId = newCall.peer

    setCall(newCall)

    await updateLocalStream(false, true)

    call.answer(localStream)

    call.on('stream', (newRemoteStream) => {
        call.close()
    });
}

/**
 * Ответ на звонок
 */
const startAnswer = async (newCall) => {

    const anotherPeerId = newCall.peer

    setCall(newCall)

    await updateLocalStream(false, true)

    call.answer(localStream)

    call.on('stream', (newRemoteStream) => {
    
        setRemoteStream(newRemoteStream)
        setUserState('call', anotherPeerId, remoteStream);    

    });

    /**
     * Не срабатывает при отключении собеседника
     * Поэтому используем метод on.error
     */
    call.on('close', () => {
        console.log('Звонок окончен')
        setUserState('stay', anotherPeerId)
    });

    /**
     * Используем для окончания звонка
     */
    call.on('error', (e) => {
        console.log('Звонок окончен:', e)
        setUserState('stay', anotherPeerId)
    });

}

/**
 * Начать звонок
 */
const startCall = async (anotherPeerId) => {
  
    console.log('Звоним: ' + anotherPeerId)

    setUserState('wait', anotherPeerId)
    
    await updateLocalStream(false, true)

    const newCall = peer.call(anotherPeerId, localStream)
    setCall(newCall)

    call.on('stream', (newRemoteStream) => {
    
        setRemoteStream(newRemoteStream)
        setUserState('call', anotherPeerId, remoteStream);            
    });

    call.on('close', () => {
        console.log('Звонок окончен')
        setUserState('stay', anotherPeerId)
    });

    /**
     * Используем для окончания звонка
     */
    call.on('error', (e) => {
        console.log('Звонок окончен:', e)
        setUserState('stay', anotherPeerId)
    });

    call.answer(localStream)
}


/**
 * Кнопка входа
 */
const loginButton = () => {

    const value = $('#input-login')[0].value.trim()

    const wsAdress = "wss://salty-tundra-03319.herokuapp.com";

    window.WebSocket = window.WebSocket || window.MozWebSocket;

    if (!window.WebSocket) {
        console.log('Sorry, but your browser doesn\'t support WebSocket.')
    }


    /**
     * Step 1
     */
    setLoginState(1)

    peer = new Peer(value, {
        host: 'rocky-river-23153.herokuapp.com',
        port: '',
        path: '/peer-server'
    })
    

    peer.on('open', function(id){
        console.log('My peer ID:' + id)
        peerId = id
        localStorage.setItem('login', peerId);

        /**
         * Step 2
         */
        setLoginState(2)
        const connection = new WebSocket(wsAdress);

        connection.onopen = function () {
            console.log('Connection is open')

            /**
             * Открываем основную стр
             */
            openUserPage()

            const data = {
                type: 'new_user',
                data: {
                    id: id
                }
            }
            connection.send(JSON.stringify(data));
        };
        connection.onerror = function (error) {
            const textError = `Sorry, but there's some problem with your connection or the server is down.`

            setLoginState('error', textError)
            console.log(textError)
        };

        connection.onmessage = function (message) {

            try {
                const json = JSON.parse(message.data);

            if (json.type === 'users_online') { 

                console.log('Online: ', json.data)

                updateListAudioRemote(json.data)
                /**
                 * Обновляем список пользователей online
                 */
                updateListUser(json.data)

            } else if (json.type === 'message') { // it's a single message
                console.log('Message: ', json.data)
            } else {
                console.log('Hmm..., I\'ve never seen JSON like this:', json);
            }
            
            } catch (e) {
                console.log('Invalid JSON: ', message.data);
                return;
            }

        }

        connection.onclose = () => {
            console.log('Соединение с websocket закрыто')
            setOnlineStatus(false)
            alert('Соединение с websocket закрыто')
            reloadPage()
        }

    })



    peer.on('call', async newCall => {

        const anotherPeerId = newCall.peer

        const text = `Вам звонок от: ${anotherPeerId}`
        console.log(text)

        /*
        const answerOnCall = confirm(text)
        
        if(answerOnCall){
            startAnswer(newCall)
        } else {
            //call.close()
            declineAnswer(newCall)
        }
        */
        startAnswer(newCall)
    })

}

const setStateStyle = (anotherPeerId, state) => {
    $(`#${anotherPeerId}`).removeClass('state-stay')
    $(`#${anotherPeerId}`).removeClass('state-wait')
    $(`#${anotherPeerId}`).removeClass('state-call')
    $(`#${anotherPeerId}`).addClass(`state-${state}`)
}

const setUserState = (state, anotherPeerId, remoteStream) => {

    switch(state){
        case 'stay': 
            setStateStyle(anotherPeerId, state)
            setLocalStream(null)
        break;

        case 'wait': 
            setStateStyle(anotherPeerId, state)
        break;

        case 'call': 
            setStateStyle(anotherPeerId, state)
            $(`#audio-${anotherPeerId}`)[0].srcObject = remoteStream
        break;
    }    
}


const getLocalStream = async (video, audio) => {

    try {

        if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {

        } else {
          const textError = 'что-то не так с аудио/видео девайсами'
          console.log(textError)
          throw new Error(textError)
        }
    
        async function getDevices() {
          const devices = await navigator.mediaDevices.enumerateDevices();
          return devices
        }

        //const devices = await getDevices()
        //console.log('devices: ', devices)
    
        const getUserMedia = navigator.mediaDevices.getUserMedia || navigator.mediaDevices.webkitGetUserMedia || navigator.mediaDevices.mozGetUserMedia;
    
        localStream = await getUserMedia({
            video: video,
            audio: audio
        })
    
        console.log('set localStream: ', localStream)

        return localStream

    } catch(e) {
        console.log('mediaDevices error: ', e)
    }

}

const setRemoteStream = (newRemoteStream) => {
    remoteStream = newRemoteStream
}

const setLocalStream = (newLocalStream) => {
    localStream = newLocalStream
}

const updateLocalStream = async (video, audio) => {
    if(video === false && audio === false){ // TODO: как-то сделать mute
        newLocalStream = await getLocalStream(true, false)
        setLocalStream({})
    } else {
        newLocalStream = await getLocalStream(video, audio)
        setLocalStream(newLocalStream)
    }
}



/**
 * Показать статус аутентификации
 * @param {*} state id состояния
 * @param {*} text  текст сообщения (для ошибки)
 */
const setLoginState = (state, text) => {
    switch(state){
        case 1:
            $('#block-message').html('Создание пира...')
        break;

        case 2:
            $('#block-message').html('Создание вебсокета...')
        break;

        case 3:
            $('#block-message').html('')
        break;

        case 'error':
            $('#block-message').html(`<div class="error">${text}</div>`)
        break;
    }
}


/**
 * Показать главную стр
 */
const openUserPage = () => {

    const page = `<div class="page-users">
        <div class="block-top">
            <div class="online-status" id="online-status"></div>
            <div class="mute-button" id="mute-button" onclick="muteButton()"><span id="mute-status"></span>mute</div>
            <div class="logout-button" onclick="logoutButton()">LogOut</div>
        </div>
        <div id="list-audio-remote"></div>
        <div id="list-audio-output" class="list-audio-output"></div>
        <div class="block-online" id="block-online"></div>
    </div>`

    $('body').html(page)

    setOnlineStatus(true)
    //renderListOutputAudioDevice()
}

const updateListAudioRemote = (listRemoteId) => {

    listRemoteId.forEach(anotherPeerId => {
        /**
         * Добавляем audio tag только если его не существует
         */
        if(!$(`#audio-${anotherPeerId}`)[0]){ // тега нету => добавляем 
            const audio = `<audio id="audio-${anotherPeerId}" autoplay></audio>`;
            $(`#list-audio-remote`).append($(audio))
        } else {  // тег уже есть => ничего не делаем

        }
        /**
         * Очищаем от тех что уже удалили
         */
        $(`audio`, '#list-audio-remote').each((i, el) => {
            const tagId = el.id.split('-')[1]

            /**
             * Удаляем тег, если его нет в обновленном списке
             */
            if(!listRemoteId.includes(tagId)){
                console.log('удаляем тег с id: '+ tagId,' - ', listRemoteId)
                $(`#audio-${tagId}`)[0].remove()
            }
        })
    })
}

/**
 * Показать страницу аутентификации
 */
const openLoginPage = (login) => {

    const loginPage = `<div class="page-login">
        <div class="block-message" id="block-message">

        </div>
        <div class="block-input">
            <input type="text" id="input-login" value="${login || ''}" />
        </div>
        <div class="block-button">
            <div class="button" onclick="loginButton()">
                Вход
            </div>
        </div>
    </div>`

    $('body').html(loginPage)
}


/**
 * Очищаем сохраненный логин из localstorage
 */
const clearLocalStorage = () => {
    localStorage.setItem('login', '');
}


/**
 * Кнопка выхода
 * - очищаем сохраненный логин
 * - показываем страницу логина (перезагрузка)
 */
const logoutButton = () => {
    clearLocalStorage()
    reloadPage()
}


/**
 * Обновляем статус ON / OFF в шапке
 * @param {*} status 
 */
const setOnlineStatus = (status) => {
    const text = status ? '' : ''
    const className = status ? 'on' : 'off'

    $('#online-status').html(`<div class=${className}>${text}</div>`)
}

/**
 * Возвращает случайное число между min (включительно) и max (включительно)
 * @param {*} min 
 * @param {*} max 
 */
const getRandomBetween = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Достать аватарку по логину
 */
const getAvatarByLogin = (login) => {

    login = login.toLowerCase()

    const avatars = {
        chaikin: [
            'chaikin_1', 
            'chaikin_2', 
            'chaikin_3', 
            'chaikin_4', 
            'chaikin_5', 
            'chaikin_6', 
            'chaikin_7', 
            'chaikin_8', 
            'chaikin_9', 
            'chaikin_10'
        ],
        chaikin_joker: [
            'chaikin_joker_1',
            'chaikin_joker_2',
            'chaikin_joker_3',
            'chaikin_joker_4',
            'chaikin_joker_5',
            'chaikin_joker_6',
            'chaikin_joker_7',
            'chaikin_joker_8'
        ],
        fat: [
            'fat_1'
        ],
        marat: [
            'marat_1'
        ],
        flower: [
            'flower_1'
        ]
    }
    const defaultAvatar = avatars.chaikin_joker[getRandomBetween(0, avatars.chaikin_joker.length - 1)]

    let avatar = defaultAvatar
    let group = 'default';        // kirill | marat | flower | joker

    if(login.includes('kir') || login.includes('unst') || login.includes('lord')){
        group = 'kirill'
    } 
    else if(login.includes('mar') || login.includes('chelo') || login.includes('chur')){
        group = 'marat'
    }
    else if(login.includes('flow') || login.includes('hui') || login.includes('cvet')){
        group = 'flower'
    } 
    else if(login.includes('jok')){
        group = 'joker'
    }


    switch(group){
        case 'kirill':
            const rand = getRandomBetween(0, 100)
            /**
             * Давать обычным авам больший приоритет, так как джокеров слишком много
             */
            console.log(rand)
            if(rand < 80){ 
                avatar = avatars.chaikin[getRandomBetween(0, avatars.chaikin.length - 1)]             // обычные
            } else {
                avatar = avatars.chaikin_joker[getRandomBetween(0, avatars.chaikin_joker.length - 1)] // с джокером
            }
        break;
        case 'marat':
            let avatarsForMarat = [...avatars.marat, ...avatars.fat]
            avatar = avatarsForMarat[getRandomBetween(0, avatarsForMarat.length - 1)]
        break;
        case 'flower':
            avatar = avatars.flower[getRandomBetween(0, avatars.flower.length - 1)]
        break;
        case 'joker':
            avatar = avatars.flower[getRandomBetween(0, avatars.flower.length - 1)]
        break;
    }

    const resulition = {
        low: '100',
        mid: '200'
    }

    return `${avatar}_${resulition.low}.png`
}

/**
 * Кнопка mute
 */
const muteButton = () => {

    if(localStream){
        const curStatus = localStream.getAudioTracks()[0].enabled
        const newStatus = !curStatus
    
        const isMute = newStatus
    
        localStream.getAudioTracks()[0].enabled = newStatus;
    
        $('#mute-status').html(isMute ? '' : 'un')
    } else {
        console.log('Нечего заглушать, localStream пустой')
    }

}


/**
 * Перезагрузка приложения
 */
const reloadPage = () => {
    location.reload()
}



/**
 * Кнопка звонка
 */
const callButton = async (anotherPeerId) => {

    startCall(anotherPeerId)
           
}

const endCallButton = () => {
    console.log('завершить звонок')
    setLocalStream(null)
    setRemoteStream(null)
    call.close()
}

const muteMyStreamButton = () => {

    if(isMuteMyLocalStream){
        updateLocalStream(false, true)
    } else {
        updateLocalStream(false, false)
    }

}

const setCall = (newCall) => {
    call = newCall
    console.log('set call: ', call)
}


const getListMediaDevices = async () => {

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(device => device.kind === 'audiooutput');

    console.log('\n\n ------- devices -----------\n\n', audioDevices)
    return audioDevices
}


const setAudioOutputDevice = async (deviceId) => {

    const audio = $(`#audio-${call.peer}`)[0];

    console.log('\n\n ------- audio -----------\n\n', audio)

    const listAudioOutput = await getListMediaDevices()

    await audio.setSinkId(listAudioOutput[0].deviceId);
    console.log('Audio is being played on ' + audio.sinkId);

}

const renderListOutputAudioDevice = async () => {

    const listAudioOutput = await getListMediaDevices()

    let list = ''
    listAudioOutput.forEach((device, i) => {
        list += `<div class="device-${i}" id="device-${device.deviceId}" onclick="setAudioOutputDevice('${device.deviceId}')">
            ${device.label}
        </div>`
    })

    $('#list-audio-output').html(list)
}

const updateListUser = (users) => {

    const userTags = $('.user', '#block-online')

    users.forEach(anotherPeerId => {
        
        const newTag = `<div class="user state-stay" id=${anotherPeerId}>
                            <div class="user-avatar">
                                <img src="images/avatar/${getAvatarByLogin(anotherPeerId)}" />
                            </div>

                            <div class="user-name" >${anotherPeerId} ${anotherPeerId === peerId ? '(You)' : ''}</div>
                            
                            <div class="remote">
                                ${anotherPeerId === peerId ? 
                                    '' : `<div class="call-button" onclick="callButton('${anotherPeerId}')">CALL</div>`}
                                <div class="wait">...</div>
                                <div class="list-button">
                                    <div class="one-button button-mute" onclick="muteMyStreamButton()">Mute</div>
                                    <div class="one-button button-end" onclick="endCallButton()">END</div>
                                </div>
                            </div>
                        </div>`

        /**
         * Нет тега => добавляем
         */   
        const tagExist = !!$('#'+anotherPeerId, '#block-online').length  
        
        if(!tagExist){
            $('#block-online').append(newTag)
        }
        
    })


    /**
     * Удаляем тег с юзером, если его нет в обновленном списке
     */
    userTags.each((i, userTag) => {
        const tagId = userTag.id

        const needRemove = !users.includes(tagId)
        if(needRemove){
            $('#'+tagId, '#block-online').remove()
        }
        
    })

}





(function init(){

    /**
     * Проверяем localstorage (сохраненные данные)
     */
    const login = localStorage.getItem('login');
    
    /**
     * Автовход
     */
    if(login){

        console.log('Автовход')
        openLoginPage(login)
        loginButton()

    } else {

        console.log('Обычный вход')
        openLoginPage()

    }




})()