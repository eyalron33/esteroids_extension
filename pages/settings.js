const addGatewayPanel = document.getElementById('addGatewayPanel');
let addGatewayButton = document.getElementById('addGatewayButton');

function loadSettings() {
    /**
     * [loadCurrentSettings function will fetch previous settings from
     * local storage and will parse them to the proper inputs]
     * @param {Object}      result      [async result of local storage]
     */
    function loadCurrentSettings(result) {
        settings = result.settings;

        // metric permission
        if (settings.metrics_permission !== true) {
            document.querySelector('#metricCheckbox').checked = false;
        } else document.querySelector('#metricCheckbox').checked = true;

        // ethereum client
        document.getElementById('urlInput').value = '';
        ethereum_select = document.forms['settingsForm'].ethereum;
        switch (settings.ethereum) {
            case 'infura':
                ethereum_select[0].checked = true;
                break;
            case 'local':
                ethereum_select[1].checked = true;
                break;
            default:
                ethereum_select[2].checked = true;
                document.getElementById('urlInput').disabled = false;
                document.getElementById('urlInput').value = settings.ethereum;
        }

        // list of ipfs gateways
        Object.keys(result.settings.gateways).forEach(function(key, index) {
            addIpfsGate(key, result.settings.gateways[key]);
        });

        // ipfs gateway settings
        if (settings.ipfs == 'random')
            document.forms['settingsForm'].gateway[0].checked = true;
        else {
            document.forms['settingsForm'].gateway[1].checked = true;
            document.getElementById('ipfs_gateways').disabled = false;
        }
				
		// shortcuts
        document.getElementById("shortcutBarInput").value = settings.shortcuts.addressbar; 
        document.getElementById("shortcutSettingsInput").value = settings.shortcuts.settings;

        // load session paramters
        var get_session = browser.storage.local.get('session');
        get_session.then(loadCurrentSession, onError);
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    function loadCurrentSession(result) {
        select = document.getElementById('ipfs_gateways');
        select.value = JSON.stringify(result.session.ipfs_gateway);
        setCurrentIPFSGateway(result.session.ipfs_gateway);
    }

    var get_settings = browser.storage.local.get('settings');
    get_settings.then(loadCurrentSettings, onError);
}

function setCurrentIPFSGateway(gateway) {
    var current_gateway = gateway.key + ": " + gateway.value;
    document.getElementById('current_gateway').innerHTML = current_gateway;
}

/**
 * [saveSettings function will write user preferences into local storage]
 * @param  {[Object]} e [Event handler]
 */
function saveSettings(e) {
    e.preventDefault();

    // collect settings data
    let metrics_permission = document.querySelector('#metricCheckbox').checked;
    if (document.forms['settingsForm'].ethereum.value !== 'other')
        var ethereum = document.forms['settingsForm'].ethereum.value;
    else var ethereum = document.getElementById('urlInput').value;

    let gateways = {};

    // TODO: upadte for managed gateways once UI for it exists
    let gateways_list = document.getElementById('ipfs_gateways');
    for (i = 0; i < gateways_list.length; i++) {
        let gateway = JSON.parse(gateways_list[i].value);
        gateways[gateway.key] = gateway.value;
    }

    if (document.forms['settingsForm'].gateway.value == 'random')
        var ipfs = 'random';
    else {
        var ipfs = document.getElementById('ipfs_gateways').value;
        setCurrentIPFSGateway(JSON.parse(ipfs)); //once saved, update current gateway in html        
    }

    let shortcuts = {
        addressbar: document.getElementById("shortcutBarInput").value,
        settings: document.getElementById("shortcutSettingsInput").value
    };

    // create and save settings
    let settings = {
        metrics_permission: metrics_permission,
        ethereum: ethereum,
        gateways: gateways,
        ipfs: ipfs,
        shortcuts: shortcuts
    };
    browser.storage.local.set({ settings });

    browser.runtime.sendMessage({
        reload_settings: true
    });

    SavedAlert("Saved",1000);
}

/**
 * [shortcutListener read key inputs of user on shortcutInputs to assign new combinations]
 * @param  {[Object]} e [Event handler]
 */
function shortcutListener(shortcut, e) {
	document.getElementById("field_disabel_form").disabled = true;
	document.activeElement.blur();
	document.addEventListener ('keydown', function handleShortcut(e) {
		if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
			handleShortcuts(shortcut, e);
			this.removeEventListener ('keydown', arguments.callee);
		}
	});
}

function handleShortcuts(shortcut, e) {
  e.stopPropagation ();
  e.preventDefault ()
  var keyStr = ["Control", "Shift", "Alt", "Meta"].includes(e.key) ? "" : e.key;
  var reportStr   =
      ( e.ctrlKey  ? "Ctrl+" : "" ) +
      ( e.shiftKey ? "Shift+"   : "" ) +
      ( e.altKey   ? "Alt+"     : "" ) +
      ( e.metaKey  ? "Meta+"    : "" ) +
      keyStr;

    var current_bar_shortcut = document.getElementById("shortcutBarInput").value;
    var current_settings_shortcut = document.getElementById("shortcutSettingsInput").value;
    if ( (shortcut == "shortcutBarInput" && current_settings_shortcut == reportStr) ||
        (shortcut == "shortcutSettingsInput" && current_bar_shortcut == reportStr)) 
        alert(reportStr + " is already used as another shortcut"); 
    else
	   document.getElementById(shortcut).value = reportStr;

	document.getElementById("field_disabel_form").disabled = false;
}

document.addEventListener('DOMContentLoaded', loadSettings);
document
    .getElementById('settingsForm')
    .addEventListener('submit', saveSettings);
document
    .getElementById('ModifyShortcutBarInput')
    .addEventListener('click', e => shortcutListener("shortcutBarInput",e));
document
    .getElementById('ModifyShortcutSettingsInput')
    .addEventListener('click', e => shortcutListener("shortcutSettingsInput", e));

// Radio group listeners
/**
 * [radioGroupListener, to catch radio group interactions from the page in hacky way]
 * @param  {[Object]} e [Event handler]
 */
function radioGroupListener(e) {
    if (e.target.getAttribute('name') === 'ethereum') {
        document.getElementById('urlInput').disabled =
            e.target.value !== 'other';
    } else if (e.target.getAttribute('name') === 'gateway') {
        document.getElementById('ipfs_gateways').disabled =
            e.target.value !== 'force_gateway';
    }
}

document.addEventListener('click', radioGroupListener);

/**
 * [openGatewayModal will populate current elements of gateway into the modal gateway list
 *  will assign event handlers for action buttons, will make modal visible later ]
 * @param  {[Object]} e [Event handler]
 */
function openGatewayModal(e) {
    const listenerCollector = [];
    const gatewayModal = document.getElementById('gatewayModal');
    const gatewayList = document.getElementById('gatewayList');
    let gateways_list = document.getElementById('ipfs_gateways');
    showGatewayModal();

    function showGatewayModal() {
        for (i = 0; i < gateways_list.length; i++) {
            const gatewayLI = document.createElement('li');
            const gatewayTextSpan = document.createElement('span');
            const gatewayEditButtonSpan = document.createElement('span');
            const gatewayRemoveButtonSpan = document.createElement('span');
            gatewayTextSpan.appendChild(
                document.createTextNode(gateways_list[i].text)
            );
            gatewayEditButtonSpan.appendChild(document.createTextNode('Edit'));
            gatewayRemoveButtonSpan.appendChild(document.createTextNode('Remove'));
            gatewayEditButtonSpan.className = 'edit-gateway-button';
            gatewayRemoveButtonSpan.className = 'remove-gateway-button';
            gatewayLI.appendChild(gatewayTextSpan);
            gatewayLI.appendChild(gatewayEditButtonSpan);
            gatewayLI.appendChild(gatewayRemoveButtonSpan);
            gatewayList.appendChild(gatewayLI);
            listenerCollector[i * 2] = {
                element: gatewayEditButtonSpan,
                evtFunc: createGatewayForm.bind(
                    null,
                    JSON.parse(gateways_list[i].value),
                    'Edit',
                    editGateway
                )
            };
            gatewayEditButtonSpan.addEventListener(
                'click',
                createGatewayForm.bind(
                    null,
                    JSON.parse(gateways_list[i].value),
                    'Edit',
                    editGateway
                )
            );

            gatewayRemoveButtonSpan.addEventListener(
                'click',
                removeGateway.bind(null, gatewayList.children[i], JSON.parse(gateways_list[i].value))
            );

            listenerCollector[i * 2 + 1] = {
                element: gatewayRemoveButtonSpan,
                evtFunc: removeGateway.bind(
                    null,
                    JSON.parse(gateways_list[i].value)
                )
            };
        }
        addGatewayButton = document.getElementById('addGatewayButton');
        addGatewayButton.addEventListener(
            'click',
            createGatewayForm.bind(null, null, 'Add', addGateway)
        );

        gatewayModal.style.display = 'flex';
    }

    /**
     * [removeListeners will remove whole assigned click listeners for action buttons]
     */
    function removeListeners() {
        listenerCollector.forEach(item => {
            item.element.removeEventListener('click', item.evtFunc);
        });

        addGatewayButton.removeEventListener(
            'click',
            createGatewayForm.bind(null, null, 'Add', addGateway)
        );

        addGatewayPanel.innerHTML =
            '<span id="addGatewayButton"> + Add new gateway</span>';
    }

    function hideGatewayModal() {
        const gatewayModal = document.getElementById('gatewayModal');
        const gatewayList = document.getElementById('gatewayList');
        removeListeners();  
        gatewayList.innerHTML = '';
        gatewayModal.style.display = 'none';
        gatewayModal.removeEventListener('click', closeGatewayModal);
    }

    /**
     * [closeGatewayModal will detect if user click outside of the modal,
     * then will make modal invisible again]
     * @param  {[Object]} e [Event handler]
     */
    const closeGatewayModal = function(e) {
        if (!event.target.closest('#gatewayModalPanel')) 
            hideGatewayModal();
    };
    gatewayModal.addEventListener('click', closeGatewayModal);
    document.getElementById('DoneModifyingGateway').addEventListener('click', hideGatewayModal);

    /**
     * [addGateway will add a gateway to the gateway list. It first checks that the gateway
     * does not exist already in the list.
     * @param  {[Object]}   item    [Gateway object]
     */
    function addGateway(e) {
        e.stopPropagation();
        name = document.getElementById("name_of_gateway").value;
        url = document.getElementById("URL_of_gateway").value;

        if ( name != "" && url != "" ) {
            addIpfsGate(name, url);
            hideGatewayModal();
            showGatewayModal();
        } else 
            alert ("Name and url can not be empty");
    }

    /**
     * [editGateway will modify a gateway when user clicks edit action button in modal]
     * @param  {[Object]}   item    [Gateway object]
     */
    function editGateway(e, item) {
        let gateways_select = document.getElementById('ipfs_gateways')

        // remove old version
        let gateway_to_edit = document.getElementById(JSON.stringify(item));
        gateways_select.removeChild(gateway_to_edit);

        //add gateway with new version
        name = document.getElementById("name_of_gateway").value;
        url = document.getElementById("URL_of_gateway").value;
        addIpfsGate(name, url);
        hideGatewayModal();
        showGatewayModal();
    }

}

document
    .getElementById('manageGatewaysButton')
    .addEventListener('click', openGatewayModal);

function addIpfsGate(key, value) {
    var option = document.createElement('option');
    var gateways = document.getElementById('ipfs_gateways');
    option.text = key + ': ' + value;
    option.value = JSON.stringify({ key: key, value: value });
    option.id = option.value;
    gateways.add(option);
}

/**
 * [createGatewayForm will create add or edit form
 *  whenever user clicks add/edit action buttons in modal]
 * @param  {[Object]}       item (Optional)     [Gateway object]
 * @param  {[String]}       btnName             [Form submit button name/text]
 * @param  {[Object]}       e                   [Event handler]
 */
function createGatewayForm(item, btnName, callback, e) {
    e.stopPropagation();
    addGatewayPanel.innerHTML = '';
    const addGatewayNameInput = document.createElement('input');
    const addGatewayURLInput = document.createElement('input');
    const saveGatewayURLButton = document.createElement('button');
    addGatewayNameInput.setAttribute('id', 'name_of_gateway');
    addGatewayNameInput.setAttribute('placeholder', 'Name of Gateway');
    addGatewayURLInput.setAttribute('id', 'URL_of_gateway');
    addGatewayURLInput.setAttribute('placeholder', 'URL of Gateway');
    saveGatewayURLButton.className = 'pure-button pure-button-primary';
    saveGatewayURLButton.appendChild(document.createTextNode(btnName));
    const addGatewayForm = document.createElement('form');

    if (item) {
        addGatewayNameInput.value = item.key;
        addGatewayURLInput.value = item.value;
    }

    addGatewayForm.appendChild(addGatewayNameInput);
    addGatewayForm.appendChild(addGatewayURLInput);
    addGatewayForm.appendChild(saveGatewayURLButton);
    addGatewayPanel.appendChild(addGatewayForm);
    saveGatewayURLButton.setAttribute('type', 'button');
    if (item) 
        saveGatewayURLButton.addEventListener('click', e=> callback(e,item));
    else
        saveGatewayURLButton.addEventListener('click', callback);
    addGatewayNameInput.focus();
}

/**
 * [removeGateway will remove gateway when user clicks remove action button in modal]
 * @param  {[Object]}   item    [Gateway object]
 */
function removeGateway(child, item, e) {
    e.stopPropagation();

    if (gatewayList.children.length == 1)
        alert("Can't remove gateway, list must include at least one gateway.")
    else if (current_gateway == (item.key + ': ' + item.value)) 
        alert(item.key + " is the current gateway. Please first change the" + 
                                " current gateway and then try this action again.");
    else {
        // remove from gateway modal
        gatewayList.removeChild(child);

        // remove from gateway select option
        let gateways_select = document.getElementById('ipfs_gateways')
        let gateway_to_remove = document.getElementById(JSON.stringify(item));
        gateways_select.removeChild(gateway_to_remove);
    }
}

/**
 * [addGateway will add a gateway to the gateway list. It first checks that the gateway
 * does not exist already in the list.
 * @param  {[Object]}   item    [Gateway object]
 */
function SavedAlert(msg,duration)
{
    savedmsg = document.getElementById('SettingsSavedMessage'); 
    savedmsg.style.display = 'flex';

    setTimeout(function(){
        savedmsg.style.display = 'none';
    },duration);
}

/**
 * Enumerates
 */
const eth_client = {
    infura: 0,
    local: 1,
    other: 2
};

const ipfs_options = {
    random: 0,
    force_gateway: 1
};
