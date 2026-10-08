/* =====================================================================
   JDA Property Services — select.js
   Searchable dropdown used for every <select class="ss-native">.

   HTML you write:
     <select class="ss-native" id="relApplicant" data-placeholder="Select relation" hidden required>
       <option value="Father">Father</option> …
     </select>

   initSearchSelects($scope) adds the visible box right after the <select>:
     <div class="ss">  [button.ss-trigger]  [div.ss-panel: search + list]  </div>
   The real <select> keeps the value, so validation, .val() and
   .on('change') work on the <select> as usual.

   Bootstrap 5.2.3 Dropdown opens / closes the panel (outside click, Esc).
   jQuery does the search filter, the arrow keys and the pick.

   Use from page code:
     setSelectOptions($select, ['A', 'B'])   replace the options
     setSelectValue($select, 'A', silent)    choose a value (silent = no change event)
     setSelectDisabled($select, true)        disable / enable
   ===================================================================== */

var SELECT_TEMPLATE =
  '<div class="ss">' +
    '<button type="button" class="ss-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false"' +
    ' data-bs-toggle="dropdown" data-bs-auto-close="outside" data-bs-display="static">' +
      '<span class="ss-value ph"></span>' +
      '<span class="ss-icons">' +
        '<svg class="ic si-search"><use href="#i-search"/></svg>' +
        '<svg class="ic si-chev"><use href="#i-chev"/></svg>' +
      '</span>' +
    '</button>' +
    '<div class="ss-panel dropdown-menu">' +
      '<div class="ss-search">' +
        '<svg class="ic"><use href="#i-search"/></svg>' +
        '<input type="text" placeholder="Search option…" aria-label="Search options" autocomplete="off" />' +
      '</div>' +
      '<ul class="ss-list" role="listbox"></ul>' +
    '</div>' +
  '</div>';

function initSearchSelects($scope) {
  $scope.find('select.ss-native').each(function () {
    var $select = $(this);
    if ($select.next('.ss').length) return;          // already built

    var $box = $(SELECT_TEMPLATE);
    $box.find('.ss-trigger').attr('aria-label', placeholderOf($select));
    $select.after($box).attr('aria-hidden', 'true').prop('hidden', true);
    showSelectedLabel($select);
  });
}

function placeholderOf($select) {
  return $select.data('placeholder') || 'Select';
}

function boxOf($select) {
  return $select.next('.ss');
}

// Show the chosen option's text (or the grey placeholder) on the button.
function showSelectedLabel($select) {
  var label = $select.val() ? $select.find('option:selected').text().trim() : '';
  boxOf($select).find('.ss-value')
    .text(label || placeholderOf($select))
    .toggleClass('ph', !label);
}

function setSelectOptions($select, items) {
  var current = $select.val();
  $select.empty();
  $.each(items, function (i, item) {
    var value = typeof item === 'string' ? item : item.value;
    var label = typeof item === 'string' ? item : item.label;
    $('<option>').val(value).text(label).appendTo($select);
  });
  // keep the current value only if it is still one of the options
  $select.val($select.find('option').filter(function () { return this.value === current; }).length ? current : null);
  showSelectedLabel($select);
}

function setSelectValue($select, value, silent) {
  $select.val(value || null);
  showSelectedLabel($select);
  if (!silent && value) $select.trigger('change');
}

function setSelectDisabled($select, disabled) {
  $select.prop('disabled', disabled);
  boxOf($select).toggleClass('is-disabled', disabled)
    .find('.ss-trigger').prop('disabled', disabled);
}

/* ---------- list of options inside the open panel ---------- */
function fillOptionList($box) {
  var $select = $box.prev('select');
  var search = $box.find('.ss-search input').val().trim().toLowerCase();
  var $list = $box.find('.ss-list').empty();

  $select.find('option').each(function () {
    var text = $(this).text().trim();
    if (!this.value || (search && text.toLowerCase().indexOf(search) === -1)) return;
    $('<li class="ss-opt" role="option">')
      .attr('data-value', this.value)
      .text(text)
      .toggleClass('is-active', this.value === $select.val())
      .appendTo($list);
  });

  if (!$list.children().length) {
    $list.append('<li class="ss-empty">No matching options</li>');
  } else if (!$list.find('.is-active').length) {
    $list.find('.ss-opt').first().addClass('is-active');   // Enter picks the first match
  }
}

function moveActiveOption($box, step) {
  var $options = $box.find('.ss-opt');
  if (!$options.length) return;
  var index = $options.index($options.filter('.is-active'));
  index = (index + step + $options.length) % $options.length;
  $options.removeClass('is-active').eq(index).addClass('is-active')[0].scrollIntoView({ block: 'nearest' });
}

function pickOption($box, value) {
  var $select = $box.prev('select');
  $select.val(value);
  showSelectedLabel($select);
  bootstrap.Dropdown.getOrCreateInstance($box.find('.ss-trigger')[0]).hide();
  $box.find('.ss-trigger').trigger('focus');
  $select.trigger('change');
}

/* ---------- events (one set for the whole page) ---------- */
// Bootstrap Dropdown opened → reset the search, list the options, focus the search box
$(document).on('shown.bs.dropdown', '.ss-trigger', function () {
  var $box = $(this).closest('.ss').addClass('open');
  $box.find('.ss-search input').val('');
  fillOptionList($box);
  $box.find('.ss-search input').trigger('focus');
});

$(document).on('hidden.bs.dropdown', '.ss-trigger', function () {
  $(this).closest('.ss').removeClass('open');
});

$(document).on('input', '.ss-search input', function () {
  fillOptionList($(this).closest('.ss'));
});

$(document).on('keydown', '.ss-search input', function (e) {
  var $box = $(this).closest('.ss');
  if (e.key === 'ArrowDown') { e.preventDefault(); moveActiveOption($box, 1); }
  if (e.key === 'ArrowUp') { e.preventDefault(); moveActiveOption($box, -1); }
  if (e.key === 'Enter') {
    e.preventDefault();
    var $active = $box.find('.ss-opt.is-active');
    if ($active.length) pickOption($box, $active.attr('data-value'));
  }
});

$(document).on('click', '.ss-opt', function () {
  pickOption($(this).closest('.ss'), $(this).attr('data-value'));
});

$(function () {
  initSearchSelects($(document));
});
