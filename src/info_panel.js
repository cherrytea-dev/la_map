function createImageDescPair(src, desc) {
    var imgDescContainer = document.createElement('div');
    imgDescContainer.className = 'img-desc-container';

    var imgContainer = document.createElement('div');
    imgContainer.className = 'img-container';
    imgDescContainer.appendChild(imgContainer);

    var img = document.createElement('img');
    img.src = src;
    imgContainer.appendChild(img);

    var text = document.createElement('span');
    text.className = 'description';
    text.textContent = desc;
    imgDescContainer.appendChild(text);

    return imgDescContainer;
}

function createInfoPanel() {
    var containerDiv = document.createElement('div');
    containerDiv.id = 'container_for_info_panel';
    containerDiv.className = 'container-for-info-panel';

    // Add the click listener to the container
    containerDiv.addEventListener('click', function() {
        document.body.removeChild(containerDiv);
    });

    var infoPanel = document.createElement('div');
    infoPanel.id = 'info_panel';
    infoPanel.className = 'info-panel';

    // Prevent clicks within the info panel from closing it
    infoPanel.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    var closeButton = document.createElement('div');
    closeButton.id = 'info_panel_close_button';
    closeButton.className = 'info-panel-close-button';
    closeButton.innerHTML = '<img src="icon_cross.jpg" alt="Close" style="width: 36px; height: 36px;">';

    // The close button also needs to stop propagation to prevent the container click
    closeButton.addEventListener('click', function(event) {
        event.stopPropagation();
        document.body.removeChild(containerDiv);
    });

    var title = document.createElement('h2');
    title.className = 'info-panel-title';
    title.textContent = 'Справка по Карте Поисковика';

    var content = document.createElement('div');
    content.className = 'info-panel-content';

    var para1 = document.createElement('p');
    para1.textContent = 'Карта Поисковика – это дополнительный функционал Бота Поисковика и основана на ваших персональных настройках, указанных в боте: список регионов, домашние координаты и максимальный радиус до поисков.';
    content.appendChild(para1);

    var para3 = document.createElement('p');
    para3.textContent = 'Условные обозначения:';
    content.appendChild(para3);

    content.appendChild(createImageDescPair('icon_home.png', 'Ваши "Домашние координты", если вы ранее указывали их в боте'));
    content.appendChild(createImageDescPair('icon_curr_loc.png', 'Ваше текушее положение, если вы разрешили его определение'));
    content.appendChild(createImageDescPair('icon_marker_green.png', 'Активный Поиск, имеет штаб c точными координатами, к тому же по поиску были изменения за последние трое суток'));
    content.appendChild(createImageDescPair('icon_marker_orange.png', 'Поиск без штаба, по которому были изменения в последние трое суток'));
    content.appendChild(createImageDescPair('icon_marker_grey.png', 'Поиски без изменений в последние трое суток (на карте отображается не более 30 поисков всех типов)'));

    var para4 = document.createElement('p');
    para4.textContent = 'Текущий функционал Карты Поисковика включает:';

    //content.appendChild(para4); MEMO - deactivated to save space and avoid scroll-ability of the panel

    var ul = document.createElement('ul');
    var li1 = document.createElement('li');
    li1.textContent = 'Указание 30-ти наиболее актуальных поисков с учетом их давности';
    ul.appendChild(li1);

    var li2 = document.createElement('li');
    li2.textContent = 'Расчет время в пути с пробками: от домашних координат до поиска (источник - Яндекс)';
    ul.appendChild(li2);

    var li3 = document.createElement('li');
    li3.textContent = 'Возможность выбора дневной или ночной темы оформления';
    ul.appendChild(li3);

    //content.appendChild(ul); MEMO - deactivated to save space and avoid scroll-ability of the panel


    var para5 = document.createElement('p');
    para5.innerHTML = 'Карта находится на стадии тестирования. Если что-то работает не корректно, пожалуйста, ' +
        'напишите об этом разработчикам в <a href="https://t.me/c/1546571473/4909">чате</a>';
    content.appendChild(para5);


    infoPanel.appendChild(closeButton);
    infoPanel.appendChild(title);
    infoPanel.appendChild(content);
    containerDiv.appendChild(infoPanel);
    document.body.appendChild(containerDiv);

}