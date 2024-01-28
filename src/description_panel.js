function createDescriptionPanel(search) {
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

    // Set the title based on search.display_name
    var title = document.createElement('h2');
    title.className = 'info-panel-title';
    title.textContent = search.display_name; // Use search.display_name as title

    // Set the content based on search.content
    var content = document.createElement('div');
    content.className = 'info-panel-content';
    if (search.content) {
        content.innerHTML = search.content + '<br>';
    } else {
        content.innerHTML = 'Описание поиска: не определено<br>';
    }

    infoPanel.appendChild(closeButton);
    infoPanel.appendChild(title);
    infoPanel.appendChild(content);
    containerDiv.appendChild(infoPanel);
    document.body.appendChild(containerDiv);
}