//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
function load()
{
    var $networks = $('#networks');

    var pref = widget.preferenceForKey('network');
    var networks = widget.system("/usr/sbin/networksetup -listallnetworkservices", function(res) {
        if (res.status != 0) return;
        $networks.empty();
        var lines = res.outputString.split('\n');

        var line, $option;
        for (var i=0,l=lines.length; i<l ;i++) {
            line = lines[i];
            if ( line.length == 0 ) continue;
            if ( /network service is disabled/i.test(line) ) continue;

            $option = $('<option></option>').text(line);
            if ( line == pref ) {
                $option.attr('selected', 'selected');
            }
            $networks.append($option);
        }
        networkChanged();

    });

    $('input[type="checkbox"]').on('change', checkboxChanged);
}

//
// Function: remove()
// Called when the widget has been removed from the Dashboard
//
function remove()
{
    // Stop any timers to prevent CPU usage
    // Remove any preferences as needed
    // widget.setPreferenceForKey(null, dashcode.createInstancePreferenceKey("your-key"));
}

//
// Function: hide()
// Called when the widget has been hidden
//
function hide()
{
    // Stop any timers to prevent CPU usage
}

function checkboxChanged(e) {
    var $parent = $(this).parent();
    
    var arg;
    if ( $parent.is($('#httpproxy')) ) {
        arg = '-setwebproxystate';
    } else if ( $parent.is($('#httpsproxy')) ) {
        arg = '-setsecurewebproxystate';
    } else {
        return;
    }
    
    var current = getCurrentNetwork();
    if ( !current ) return;

    var newval = $(this).is(':checked') ? 'On' : 'Off';
    
    widget.system("/usr/sbin/networksetup " + arg + " '" + current + "' " + newval, function(res) {
        if ( res.status == 0 ) {
            getCurrentStates();
        }
    });
}

function setStateCallback($widget) {
    return function(res) {
        if ( res.status != 0 ) return;

        var enabled = false, address = "", port = 0;
        var lines = res.outputString.split('\n');
        
        var m, line;
        for (var i=0,l=lines.length; i<l ;i++) {
            line = lines[i];
            
            m = /^Enabled:\s+(.*)/i.exec(line);
            if ( m ) {
                enabled = /yes/i.test(m[1]);
                continue;
            }
            m = /^Server:\s+(.*)/i.exec(line);
            if ( m ) {
                address = m[1];
                continue;
            }
            
            m = /^Port:\s+(.*)/i.exec(line);
            if ( m ) {
                port = m[1];
                continue;
            }
        }
        
        $widget.prop('checked', enabled);

        var $parent = $widget.parent();
        if ( address ) {
            $widget.prop('disabled', false);
            $parent.attr('title', address + ':' + port);
        } else {
            $widget.prop('disabled', true);
            $parent.attr('title', 'No server configured');
        }
    }
}

function getCurrentNetwork() {
    var current = $('#networks').val();
    if ( !current ) return null;
    
    return current.replace('\'', '\\\'');
}

function getCurrentStates() {
    var current = getCurrentNetwork();
    
    var callback1 = setStateCallback($('#httpproxy > input'));
    var callback2 = setStateCallback($('#httpsproxy > input'));

    widget.system("/usr/sbin/networksetup -getwebproxy '" + current + "'", callback1);
    widget.system("/usr/sbin/networksetup -getsecurewebproxy '" + current + "'", callback2);
}

//
// Function: show()
// Called when the widget has been shown
//
function show()
{
    // Restart any timers that were stopped on hide
    getCurrentStates();
}


if (window.widget) {
    widget.onremove = remove;
    widget.onhide = hide;
    widget.onshow = show;
}


function networkChanged(event)
{
    getCurrentStates();
    widget.setPreferenceForKey($('#networks').val(), 'network');
}


function openPrefs(event)
{
     widget.system('osascript -e \'tell app "system preferences" to activate\' -e \'tell app "system preferences" to set the current pane to pane id "com.apple.preference.network"\'');
}

