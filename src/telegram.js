
// get the data if opened from Telegram
let tg = window.Telegram.WebApp;
tg.expand();


// FIXME – SETTING BUTTON experiment
// Implement the callback function for the Settings button click event
function onSettingsClicked() {
    // Your logic here. For example, open a settings page or show an alert
    alert("Settings button clicked!");
}
// Set the click event handler for the Settings button
tg.SettingsButton.onClick(onSettingsClicked);
tg.SettingsButton.hide();

tg.MainButton.setText('Главна кнопа');
tg.MainButton.onClick(onSettingsClicked);
tg.MainButton.hide();

tg.BackButton.onClick(onSettingsClicked);
tg.BackButton.hide();

// FIXME ^^^

var entry_point = null

window.colorScheme = window.Telegram.WebApp.colorScheme // Either “light” or “dark”
console.log('color scheme is defined by Telegram as ', window.colorScheme)

var userTheme = 'light'
if (window.colorScheme) {userTheme = window.colorScheme}  // for telegram
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {userTheme = 'dark'}  // 

let yandexApiUrl = 'https://api-maps.yandex.ru/2.1/?apikey=e4cd343a-3c64-40e4-8c01-12dafeb612b5&lang=ru_RU';
let yandexRoundedControls = 'yandex_rounded_controls.js';
let mapScript = 'map.js';

const loaderCSSCode = `
    <div id="circularG_1" class="circularG"></div>
    <div id="circularG_2" class="circularG"></div>
    <div id="circularG_3" class="circularG"></div>
    <div id="circularG_4" class="circularG"></div>
    <div id="circularG_5" class="circularG"></div>
    <div id="circularG_6" class="circularG"></div>
    <div id="circularG_7" class="circularG"></div>
    <div id="circularG_8" class="circularG"></div>
`;

var loaderCSS = document.createElement('div');
loaderCSS.id = 'circularG'
loaderCSS.className = 'centered_loader'
loaderCSS.innerHTML = loaderCSSCode


function updateLoaderColor() {
    if (userTheme === 'dark') {
        document.documentElement.style.setProperty('--circularG-bg-color', 'rgb(200, 200, 200)');
    } else {
        document.documentElement.style.setProperty('--circularG-bg-color', 'rgb(80, 80, 80)');
    }
}

function loadSingleScriptByName(src) {
    return new Promise(function(resolve, reject) {
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function loadPrerequisiteMapScripts() {
    // Chain the script loading promises and return the combined promise
    return loadSingleScriptByName(yandexApiUrl)
        .then(() => {
            console.log('Yandex Maps API loaded');
            return loadSingleScriptByName(yandexRoundedControls)
        })
        .then(() => {
            console.log('Yandex rounded controls loaded');
        })
        .catch((error) => {
            console.error('Error loading script:', error);
        });
}

async function initiateMapCreation() {
    await loadPrerequisiteMapScripts();

    var script = document.createElement('script');
    document.getElementById('map').style.display = 'initial'
    script.src = mapScript; // Update the path to your map.js
    document.head.appendChild(script);

}

function createLoginPage() {
    var loaderDiv = document.createElement('div');
    loaderDiv.id = 'login_page';
    loaderDiv.className = 'login_page';
    document.body.appendChild(loaderDiv);
    if (userTheme === 'dark') {
        document.body.style.background = 'black'
    }
}

function defineEntryPoint() {
    let tg_data = window.Telegram
    let tg_webview = tg_data.WebView.initParams
    let tg_webapp = tg_data.WebApp.initDataUnsafe

    // DEFINE ENTRY POINT (Browser, Telegram Web App or Telegram Web View)
    if (Object.keys(tg_webapp).length !== 0) {
        // Entry = WebApp
        entry_point = 'web_app'
    } else {
        if (Object.keys(tg_webview).length !== 0) {
            entry_point = 'web_view'
        } else {
            entry_point = 'web_browser'
        }
    }
    console.log('entry point is ' + entry_point)
}

function loadTelegramLoginScript() {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.body) {

            let tgLoginText = document.createElement('div');
            tgLoginText.id = 'tg_login_text'
            tgLoginText.className = 'tg_login_text centered'
            tgLoginText.innerHTML = 'Привет, сервис работает только для существующих пользвателей ' +
                '<a href="https://t.me/LizaAlert_Searcher_Bot">Бота Поисковика ЛА</a>. Чтобы начать ' +
                'пользоваться сервисом, зарегистрируйтесь в Боте, а потом заходите в этот сервис ' +
                'и в пару кликов пройдите аутентификацию.<br><br>'
            tgLoginText.setAttribute('class', 'tg_login_text')
            if (userTheme === 'dark') {
                tgLoginText.style.background = 'black'
            }
            document.getElementById('login_page').appendChild(tgLoginText);

            let scriptContainer = document.createElement('div');
            scriptContainer.id = 'script_container'
            scriptContainer.className = 'script_container'
            if (userTheme === 'dark') {
                scriptContainer.style.background = 'black'
            }
            document.getElementById('login_page').appendChild(scriptContainer);

            let script = document.createElement('script');
            script.async = true;
            script.id = 'login_script';
            script.className = 'login_script centered';
            script.src = 'https://telegram.org/js/telegram-widget.js?22';
            script.setAttribute('data-telegram-login', 'LizaAlert_Searcher_Bot');
            script.setAttribute('data-size', 'large');
            script.setAttribute('data-onauth', 'onTelegramAuth(user)');
            document.getElementById('script_container').appendChild(script);
        } else {
            console.error("document.body is null or undefined.");
        }
    });
}

function apiCall(user_data) {

    let apiUrl = 'https://europe-west3-lizaalert-bot-01.cloudfunctions.net/user_provide_info';

    // Preflight request
    let preflightHeaders;

    fetch(apiUrl, {
        method: 'OPTIONS',
        headers: {
            'Content-Type': 'application/json',
            // Add any other headers if needed
        },
    })
        .then(response => {
            // Store preflight headers for later use
            preflightHeaders = response.headers;
            return response;
        })
        .then(() => {
            // Main request
            return fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Use preflight headers in the main request
                    ...(preflightHeaders ? { 'Access-Control-Request-Headers':
                            preflightHeaders.get('Access-Control-Request-Headers') } : {}),
                    // Add any other headers if needed
                },
                body: JSON.stringify(user_data),
            });
        })
        .then(response => response.json())
        .then(data => {

            var response_data = JSON.stringify(data, null, 2)
            //var apiReply = document.createElement('p');
            //apiReply.innerText = 'Api Reply: ' + (response_data ? response_data : 'N/A');
            //document.body.appendChild(apiReply);

            console.log('Main Request Response:', data);

            if (data.ok === true) {
                window.userData = data
                initiateMapCreation();
                console.log('end of file')

            }


        })
        .catch(err => {
            var apiReply = document.createElement('p');
            apiReply.innerText = 'Error in getting API reply: ' + (err ? err : 'N/A');
            document.body.appendChild(apiReply);

            console.log('Main Request Response error:', err);
        });
}


function onTelegramAuth(user) {

    // Log the entire JSON object to the console
    console.log('User JSON:', JSON.stringify(user, null, 2));
    console.log('Hash: ' + user.hash);

    if (Object.keys(user).length !== 0) {
        var iframe = document.querySelector('iframe');

        // Check if an iframe element was found
        if (iframe) {
            // Remove the iframe element
            iframe.parentNode.removeChild(iframe);
            document.getElementById('tg_login_text').remove()
            document.getElementById('script_container').remove()
            document.getElementById('login_page').appendChild(loaderCSS);
        } else {
            console.log('No iframe element found.');
        }
        apiCall(user)
    }

}


document.addEventListener('DOMContentLoaded', function() {
    updateLoaderColor();
    createLoginPage();
});

defineEntryPoint();

if (entry_point === 'web_app') {

    // MEMO – WEB_APP case
    document.addEventListener('DOMContentLoaded', function() {
        createLoginPage()
        document.getElementById('login_page').appendChild(loaderCSS);
        //loadSingleScriptByName(yandexApiUrl)
    });

    // MEMO – deactivated to check if it makes the difference
    // the below is added to prevent app closure by swipe down gesture –
    // as per https://stackoverflow.com/questions/76842573/a-bug-with-collapsing-when-scrolling-in-web-app-for-telegram-bot
    //document.addEventListener("touchmove", function (event) {
    //    event.preventDefault();
    //}, {passive: false});

    apiCall(window.Telegram.WebApp.initData)

} else {

    // MEMO – NOT web_app case
    document.addEventListener('DOMContentLoaded', function() {
        //loadTelegramLoginScript()
    });
    //loadSingleScriptByName(yandexApiUrl)
    loadTelegramLoginScript()


}


