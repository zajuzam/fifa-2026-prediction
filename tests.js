
// =============================================================
// FUNCTIONS UNDER TEST (copied from FIFA2026_Prediction.html)
// =============================================================

var TEAM_CODES = {
  'Mexico':'mx','South Africa':'za','South Korea':'kr','Czechia':'cz',
  'Canada':'ca','Bosnia & Herz.':'ba','Qatar':'qa','Switzerland':'ch',
  'Brazil':'br','Morocco':'ma','Haiti':'ht','Scotland':'gb-sct',
  'United States':'us','Paraguay':'py','Australia':'au','Turkiye':'tr',
  'Germany':'de','Curacao':'cw','Ivory Coast':'ci','Ecuador':'ec',
  'Netherlands':'nl','Japan':'jp','Sweden':'se','Tunisia':'tn',
  'Belgium':'be','Egypt':'eg','Iran':'ir','New Zealand':'nz',
  'Spain':'es','Cape Verde':'cv','Saudi Arabia':'sa','Uruguay':'uy',
  'France':'fr','Senegal':'sn','Iraq':'iq','Norway':'no',
  'Argentina':'ar','Algeria':'dz','Austria':'at','Jordan':'jo',
  'Portugal':'pt','DR Congo':'cd','Uzbekistan':'uz','Colombia':'co',
  'England':'gb-eng','Croatia':'hr','Ghana':'gh','Panama':'pa','TBD':'un'
};

function teamFlagImg(name) {
  var code = TEAM_CODES[name];
  if (!code) return '';
  return '<img src="https://flagcdn.com/32x24/' + code + '.png" alt="' + name + '" class="dm-flag">';
}

function countryToFlag(country) {
  if (!country) return '';
  var m = {
    'Afghanistan':'af','Albania':'al','Algeria':'dz','Angola':'ao','Argentina':'ar',
    'Armenia':'am','Australia':'au','Austria':'at','Azerbaijan':'az','Bahrain':'bh',
    'Bangladesh':'bd','Belgium':'be','Bolivia':'bo','Bosnia and Herzegovina':'ba',
    'Bosnia & Herz.':'ba','Brazil':'br','Bulgaria':'bg','Cameroon':'cm','Canada':'ca',
    'Chile':'cl','China':'cn','Colombia':'co','Costa Rica':'cr','Croatia':'hr',
    'Czechia':'cz','Czech Republic':'cz','Denmark':'dk','Ecuador':'ec','Egypt':'eg',
    'Finland':'fi','France':'fr','Germany':'de','Ghana':'gh','Greece':'gr',
    'Honduras':'hn','Hungary':'hu','India':'in','Indonesia':'id','Iran':'ir',
    'Iraq':'iq','Ireland':'ie','Israel':'il','Italy':'it','Jamaica':'jm','Japan':'jp',
    'Jordan':'jo','Kazakhstan':'kz','Kenya':'ke','Kuwait':'kw','Latvia':'lv',
    'Lebanon':'lb','Malaysia':'my','Mexico':'mx','Morocco':'ma','Netherlands':'nl',
    'New Zealand':'nz','Nigeria':'ng','Norway':'no','Oman':'om','Pakistan':'pk',
    'Panama':'pa','Paraguay':'py','Peru':'pe','Philippines':'ph','Poland':'pl',
    'Portugal':'pt','Qatar':'qa','Romania':'ro','Russia':'ru','Saudi Arabia':'sa',
    'Senegal':'sn','Serbia':'rs','Singapore':'sg','Slovakia':'sk','Slovenia':'si',
    'South Africa':'za','South Korea':'kr','Spain':'es','Sri Lanka':'lk','Sweden':'se',
    'Switzerland':'ch','Taiwan':'tw','Thailand':'th','Tunisia':'tn','Turkey':'tr',
    'Turkiye':'tr','Ukraine':'ua','United Arab Emirates':'ae','UAE':'ae',
    'United Kingdom':'gb','UK':'gb','England':'gb','Scotland':'gb','Wales':'gb',
    'United States':'us','USA':'us','Uruguay':'uy','Uzbekistan':'uz',
    'Venezuela':'ve','Vietnam':'vn','Yemen':'ye','Zimbabwe':'zw'
  };
  var t = country.trim();
  var code = t.length === 2 ? t.toLowerCase() : m[t];
  if (!code) return '';
  return '<img src="https://flagcdn.com/20x15/' + code + '.png" alt="' + t + '" title="' + t + '" style="vertical-align:middle;margin-right:5px;border-radius:2px">';
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', weekday:'short'});
}

function calcPoints(ps1, ps2, as1, as2) {
  ps1=parseInt(ps1); ps2=parseInt(ps2); as1=parseInt(as1); as2=parseInt(as2);
  if (isNaN(ps1)||isNaN(ps2)||isNaN(as1)||isNaN(as2)) return 0;
  if (ps1===as1 && ps2===as2) return 3;
  return Math.sign(ps1-ps2) === Math.sign(as1-as2) ? 1 : 0;
}

function isMatchLocked(date, time) {
  var mx = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!mx) return false;
  var h = parseInt(mx[1]), min = parseInt(mx[2]);
  if (mx[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (mx[3].toUpperCase() === 'AM' && h === 12) h = 0;
  var kickoff = new Date(date + 'T' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0') + ':00-04:00');
  return Date.now() >= kickoff.getTime();
}

// App globals
var VENUE_INFO = {
  'Estadio Azteca': {stadium:'Estadio Azteca', city:'Mexico City', state:'', map:'https://maps.google.com/?q=Azteca'},
  'MetLife Stadium': {stadium:'MetLife Stadium', city:'East Rutherford', state:'NJ', map:'https://maps.google.com/?q=MetLife'}
};
var FLAGS = {'Argentina':'AR','France':'FR','Brazil':'BR','TBD':'?'};
var matches=[], actualScores={}, predictions={}, knockoutTeams={};
var currentUser='', pinVerified=false, predDateFilter='';

function getTeam(m, side) {
  var ko = knockoutTeams[m.id];
  if (ko && ko[side] && ko[side] !== 'TBD') return ko[side];
  return m[side];
}

function renderTodayMatches() {
  var container = document.getElementById('todayMatchesContainer');
  var now = new Date();
  var todayStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var parseET = function(t) {
    var x = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!x) return 0;
    var h=parseInt(x[1]), mn=parseInt(x[2]);
    if (x[3].toUpperCase()==='PM' && h!==12) h+=12;
    if (x[3].toUpperCase()==='AM' && h===12) h=0;
    return h*60+mn;
  };
  var todayMatches = matches.filter(function(m){ return m.date===todayStr; })
    .sort(function(a,b){ return parseET(a.time)-parseET(b.time); });
  if (!todayMatches.length) {
    container.innerHTML='<div class="no-matches-today"><div class="big-icon">X</div><h3>No matches today</h3></div>';
    return;
  }
  var dateObj = new Date(todayStr+'T12:00:00');
  var dayName = dateObj.toLocaleDateString('en-US',{weekday:'long'}).toUpperCase();
  var monthDay = dateObj.toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  var rows = '';
  todayMatches.forEach(function(m) {
    var vi = VENUE_INFO[m.venue] || {stadium:m.venue, city:'', state:''};
    var sc = actualScores[m.id], hasScore = sc!==undefined;
    var grpLabel = m.group!=='-' ? 'GROUP '+m.group : m.stage.toUpperCase();
    var mapLink = vi.map ? ' - <a href="'+vi.map+'" target="_blank" rel="noopener">Map</a>' : '';
    rows +=
      '<div class="dark-match-row">'+
        '<div class="dm-time">'+m.time+' ET</div>'+
        '<div class="dm-team">'+teamFlagImg(m.team1)+'<span>'+m.team1+'</span></div>'+
        (hasScore ? '<div class="dm-score">'+sc.s1+' - '+sc.s2+'</div>' : '<div class="dm-vs">VS</div>')+
        '<div class="dm-team right"><span>'+m.team2+'</span>'+teamFlagImg(m.team2)+'</div>'+
      '</div>'+
      '<div class="dm-meta">'+
        '<span class="dm-group">'+grpLabel+'</span>'+
        '<span class="dm-venue">'+vi.stadium+(vi.city?' - '+vi.city+(vi.state?', '+vi.state:''):'')+mapLink+'</span>'+
      '</div>';
  });
  container.innerHTML = '<div class="dark-schedule"><div class="dark-date-hdr">'+dayName+' '+monthDay+'</div><div class="dark-matches-card">'+rows+'</div></div>';
}

function renderPredDateButtons() {
  var isKO = document.getElementById('predStageFilter').value === 'Knockout';
  var row = document.getElementById('predDateRow');
  if (isKO) { row.style.display='none'; return; }
  row.style.display = 'flex';
  var now = new Date();
  var ts = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var dates = Array.from(new Set(matches.filter(function(m){ return m.stage==='Group Stage'; }).map(function(m){ return m.date; }))).sort();
  var b = '<button onclick="setPredDate(\'\');" style="background:'+(predDateFilter===''?'var(--navy)':'#fff')+';color:'+(predDateFilter===''?'#fff':'var(--navy)')+'">All</button>';
  dates.forEach(function(d) {
    var sel = predDateFilter===d, isT = d===ts;
    var lbl = new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
    b += '<button onclick="setPredDate(\''+d+'\');" style="border:2px solid '+(isT?'var(--gold)':'var(--border)')+';background:'+(sel?'var(--navy)':'#fff')+';color:'+(sel?'#fff':'var(--navy)')+';">'+(isT?'zap ':'')+lbl+'</button>';
  });
  document.getElementById('predDateBtns').innerHTML = b;
}
function setPredDate(d) { predDateFilter=d; renderPredDateButtons(); }

function renderPredictions() {
  renderPredDateButtons();
  var container = document.getElementById('predictContainer');
  if (!pinVerified) {
    container.innerHTML = '<div>PIN required</div>';
    return;
  }
  var predStage = document.getElementById('predStageFilter').value;
  var grp = document.getElementById('predGroupFilter').value;
  var onlyUnpred = document.getElementById('showUnpredicted').checked;
  var isKnockout = predStage === 'Knockout';
  var knockoutStages = ['Round of 32','Round of 16','Quarterfinal','Semifinal','Bronze Medal','Final'];
  document.getElementById('predGroupFilter').style.display = isKnockout ? 'none' : '';
  var userPreds = predictions[currentUser] || {};
  var list = matches.filter(function(m) {
    if (isKnockout) return knockoutStages.includes(m.stage);
    if (m.stage !== 'Group Stage') return false;
    if (grp && m.group !== grp) return false;
    if (predDateFilter && m.date !== predDateFilter) return false;
    if (onlyUnpred && userPreds[m.id]) return false;
    return true;
  });
  // Sort by date then by kick-off time (EST)
  var parseETp = function(t) {
    var x = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!x) return 0;
    var h=parseInt(x[1]), mn=parseInt(x[2]);
    if (x[3].toUpperCase()==='PM' && h!==12) h+=12;
    if (x[3].toUpperCase()==='AM' && h===12) h=0;
    return h*60+mn;
  };
  list.sort(function(a,b){ return a.date.localeCompare(b.date) || parseETp(a.time)-parseETp(b.time); });
  var html = '<div class="pred-dark-wrap"><div class="pred-dark-card">';
  var lastGrp = '';
  list.forEach(function(m) {
    var t1 = getTeam(m,'team1'), t2 = getTeam(m,'team2');
    if (isKnockout && m.stage!==lastGrp) { html+='<div class="pred-dark-grp-hdr">'+m.stage+'</div>'; lastGrp=m.stage; }
    var sc = actualScores[m.id], pred = userPreds[m.id] || {};
    var isLocked = (function(date, time) {
      var mx = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!mx) return false;
      var h=parseInt(mx[1]), min=parseInt(mx[2]);
      if (mx[3].toUpperCase()==='PM' && h!==12) h+=12;
      if (mx[3].toUpperCase()==='AM' && h===12) h=0;
      var kickoff = new Date(date+'T'+String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')+':00-04:00');
      return Date.now() >= kickoff.getTime();
    })(m.date, m.time);
    var ptsBadge = '';
    if (sc!==undefined && pred.s1!==undefined) {
      var pts = calcPoints(pred.s1,pred.s2,sc.s1,sc.s2);
      ptsBadge = pts===3 ? '<span class="score-badge score-exact">+3 pts</span>'
                : pts===1 ? '<span class="score-badge score-result">+1 pt</span>'
                :            '<span class="score-badge score-wrong">0 pts</span>';
    }
    var grpLabel = m.group!=='-' ? '<span style="color:#D4AF37;font-weight:700">Group '+m.group+'</span>' : '';
    html +=
      '<div class="pred-dark-row">'+
        '<div class="pred-dark-team">'+teamFlagImg(t1)+'<span>'+t1+'</span></div>'+
        '<div class="pred-dark-center"><div class="pred-dark-inputs">'+
          '<input type="number" id="pred_'+m.id+'_s1" value="'+(pred.s1!==undefined?pred.s1:'')+'" data-mid="'+m.id+'" data-side="s1"'+(isLocked?' disabled':'')+'>'+
          '<span class="dash">:</span>'+
          '<input type="number" id="pred_'+m.id+'_s2" value="'+(pred.s2!==undefined?pred.s2:'')+'" data-mid="'+m.id+'" data-side="s2"'+(isLocked?' disabled':'')+'>'+
        '</div></div>'+
        '<div class="pred-dark-team right"><span>'+t2+'</span>'+teamFlagImg(t2)+'</div>'+
      '</div>'+
      '<div class="dm-meta"><span class="pred-dark-info">'+fmtDate(m.date)+' - '+m.time+
        (m.group!=='-' ? ' - '+grpLabel : '')+
        (sc!==undefined ? ' - <span class="pred-dark-actual">Actual: '+sc.s1+'-'+sc.s2+'</span>' : '')+
        (isLocked ? ' <span class="pred-dark-lock">Locked</span>' : '')+
      '</span><span>'+ptsBadge+'</span></div>';
  });
  container.innerHTML = list.length ? html+'</div></div>' : '<p>All predictions submitted!</p>';
}

// =============================================================
// MINI TEST RUNNER
// =============================================================
var suites=[], currentSuite=null;

function describe(name, fn) { currentSuite={name:name,tests:[]}; suites.push(currentSuite); fn(); }
function it(name, fn) {
  try { fn(); currentSuite.tests.push({name:name,pass:true}); }
  catch(e) { currentSuite.tests.push({name:name,pass:false,err:e.message}); }
}
function expect(val) {
  return {
    toBe: function(exp){ if(val!==exp) throw new Error('Expected '+JSON.stringify(exp)+', got '+JSON.stringify(val)); },
    toContain: function(s){ if(!String(val).includes(s)) throw new Error('Expected to contain '+JSON.stringify(s)+'\nIn: '+String(val).slice(0,200)); },
    notToContain: function(s){ if(String(val).includes(s)) throw new Error('Expected NOT to contain '+JSON.stringify(s)); },
    toBeTrue: function(){ if(val!==true) throw new Error('Expected true, got '+JSON.stringify(val)); },
    toBeFalse: function(){ if(val!==false) throw new Error('Expected false, got '+JSON.stringify(val)); }
  };
}

function resetState() {
  matches=[]; actualScores={}; predictions={}; knockoutTeams={};
  currentUser=''; pinVerified=false; predDateFilter='';
  document.getElementById('predStageFilter').value='Group Stage';
  document.getElementById('predGroupFilter').value='';
  document.getElementById('showUnpredicted').checked=false;
  document.getElementById('predDateRow').style.display='flex';
}

// =============================================================
// TEST SUITES
// =============================================================

// 1. TEAM_CODES
describe('TEAM_CODES - all 48 World Cup 2026 teams mapped', function() {
  var expected=['Mexico','South Africa','South Korea','Czechia','Canada','Bosnia & Herz.','Qatar','Switzerland','Brazil','Morocco','Haiti','Scotland','United States','Paraguay','Australia','Turkiye','Germany','Curacao','Ivory Coast','Ecuador','Netherlands','Japan','Sweden','Tunisia','Belgium','Egypt','Iran','New Zealand','Spain','Cape Verde','Saudi Arabia','Uruguay','France','Senegal','Iraq','Norway','Argentina','Algeria','Austria','Jordan','Portugal','DR Congo','Uzbekistan','Colombia','England','Croatia','Ghana','Panama'];
  it('has 49 entries (48 teams + TBD)', function(){ expect(Object.keys(TEAM_CODES).length).toBe(49); });
  expected.forEach(function(team){ it('has entry for '+team, function(){ if(!TEAM_CODES[team]) throw new Error('Missing: '+team); }); });
  it('England=gb-eng', function(){ expect(TEAM_CODES['England']).toBe('gb-eng'); });
  it('Scotland=gb-sct', function(){ expect(TEAM_CODES['Scotland']).toBe('gb-sct'); });
  it('TBD=un', function(){ expect(TEAM_CODES['TBD']).toBe('un'); });
  it('Ivory Coast=ci', function(){ expect(TEAM_CODES['Ivory Coast']).toBe('ci'); });
});

// 2. teamFlagImg
describe('teamFlagImg() - 32x24 img tags', function() {
  it('img tag with correct src for Argentina', function(){ expect(teamFlagImg('Argentina')).toContain('32x24/ar.png'); });
  it('has dm-flag class', function(){ expect(teamFlagImg('France')).toContain('class="dm-flag"'); });
  it('England uses gb-eng', function(){ expect(teamFlagImg('England')).toContain('32x24/gb-eng.png'); });
  it('Scotland uses gb-sct', function(){ expect(teamFlagImg('Scotland')).toContain('32x24/gb-sct.png'); });
  it('empty for unknown team', function(){ expect(teamFlagImg('Atlantis')).toBe(''); });
  it('empty for empty string', function(){ expect(teamFlagImg('')).toBe(''); });
  it('uses 32x24 not 20x15', function(){ expect(teamFlagImg('Brazil')).toContain('32x24'); expect(teamFlagImg('Brazil')).notToContain('20x15'); });
  it('no display:inline-block style', function(){ expect(teamFlagImg('Brazil')).notToContain('display:inline-block'); });
});

// 3. countryToFlag
describe('countryToFlag() - 20x15 leaderboard flags', function() {
  it('img for Argentina', function(){ expect(countryToFlag('Argentina')).toContain('20x15/ar.png'); });
  it('accepts 2-letter ISO code', function(){ expect(countryToFlag('fr')).toContain('20x15/fr.png'); });
  it('empty for null', function(){ expect(countryToFlag(null)).toBe(''); });
  it('empty for empty string', function(){ expect(countryToFlag('')).toBe(''); });
  it('empty for unknown country', function(){ expect(countryToFlag('Neverland')).toBe(''); });
  it('no display:inline-block (removed in this commit)', function(){ expect(countryToFlag('France')).notToContain('display:inline-block'); });
  it('includes vertical-align:middle', function(){ expect(countryToFlag('Germany')).toContain('vertical-align:middle'); });
  it('Turkiye alias works', function(){ expect(countryToFlag('Turkiye')).toContain('20x15/tr.png'); });
  it('Bosnia & Herz. alias works', function(){ expect(countryToFlag('Bosnia & Herz.')).toContain('20x15/ba.png'); });
  it('uses 20x15 not 32x24', function(){ expect(countryToFlag('Brazil')).toContain('20x15'); expect(countryToFlag('Brazil')).notToContain('32x24'); });
});

// 4. fmtDate
describe('fmtDate() - date formatting', function() {
  it('formats 2026-06-11', function(){ var r=fmtDate('2026-06-11'); expect(r).toContain('Jun'); expect(r).toContain('11'); });
  it('empty for null', function(){ expect(fmtDate(null)).toBe(''); });
  it('empty for empty string', function(){ expect(fmtDate('')).toBe(''); });
  it('includes weekday abbreviation', function(){
    var r=fmtDate('2026-06-14');
    var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    if(!days.some(function(d){ return r.includes(d); })) throw new Error('No weekday in: '+r);
  });
});

// 5. isMatchLocked
describe('isMatchLocked() - kickoff lock (ET = UTC-4)', function() {
  it('false for invalid time', function(){ expect(isMatchLocked('2026-06-11','TBD')).toBeFalse(); });
  it('false for far-future match', function(){ expect(isMatchLocked('2099-01-01','3:00 PM')).toBeFalse(); });
  it('true for past match', function(){ expect(isMatchLocked('2020-01-01','3:00 PM')).toBeTrue(); });
  it('12:00 PM = noon (locked if past)', function(){ expect(isMatchLocked('2020-06-11','12:00 PM')).toBeTrue(); });
  it('12:00 AM = midnight (locked if past)', function(){ expect(isMatchLocked('2020-06-11','12:00 AM')).toBeTrue(); });
  it('9:00 PM future = not locked', function(){ expect(isMatchLocked('2099-06-11','9:00 PM')).toBeFalse(); });
});

// 6. renderTodayMatches
describe('renderTodayMatches() - dark card structure', function() {
  var todayStr=(function(){ var n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })();

  it('no-matches message when no matches today', function(){
    resetState();
    matches=[{id:'m1',date:'2099-01-01',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('no-matches-today');
  });
  it('dark-schedule wrapper rendered', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('dark-schedule'); expect(h).toContain('dark-date-hdr'); expect(h).toContain('dark-matches-card');
  });
  it('dark-match-row with dm-time, dm-team, dm-meta', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('dark-match-row'); expect(h).toContain('dm-time'); expect(h).toContain('dm-team'); expect(h).toContain('dm-meta');
  });
  it('VS shown when no score', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('dm-vs');
  });
  it('dm-score shown when score exists', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}};
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('dm-score'); expect(h).toContain('2 - 1');
  });
  it('flag images included for both teams', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    expect(h).toContain('32x24/ar.png'); expect(h).toContain('32x24/fr.png');
  });
  it('date header has day name and month/day', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    var hdr=document.querySelector('.dark-date-hdr');
    if(!hdr) throw new Error('No .dark-date-hdr');
    if(!/\w+ \d+\/\d+/.test(hdr.textContent)) throw new Error('Bad header: '+hdr.textContent);
  });
  it('no old today-match-card class', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).notToContain('today-match-card');
  });
  it('GROUP A label shown', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('GROUP A');
  });
  it('matches sorted by ET time', function(){
    resetState();
    matches=[
      {id:'m2',date:todayStr,team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'},
      {id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}
    ];
    renderTodayMatches();
    var h=document.getElementById('todayMatchesContainer').innerHTML;
    if(h.indexOf('3:00 PM') > h.indexOf('6:00 PM')) throw new Error('3:00 PM should appear before 6:00 PM');
  });
  it('map link shown for venue with map', function(){
    resetState();
    matches=[{id:'m1',date:todayStr,team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderTodayMatches();
    expect(document.getElementById('todayMatchesContainer').innerHTML).toContain('maps.google.com');
  });
});

// 7. renderPredictions
describe('renderPredictions() - dark design, sort by time, group label, locking', function() {
  it('PIN prompt when not verified', function(){
    resetState(); pinVerified=false; renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).toContain('PIN');
  });
  it('pred-dark-wrap and pred-dark-card rendered', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-wrap'); expect(h).toContain('pred-dark-card');
  });
  it('pred-dark-row with team and inputs', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-row'); expect(h).toContain('pred-dark-team'); expect(h).toContain('pred-dark-inputs');
  });
  it('flag images for both teams', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('32x24/ar.png'); expect(h).toContain('32x24/fr.png');
  });

  // Group label (new feature)
  it('shows group name in gold after time', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Group A'); expect(h).toContain('color:#D4AF37');
  });
  it('no group label for knockout matches (group=-)', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2099-07-01',team1:'TBD',team2:'TBD',group:'-',stage:'Quarterfinal',time:'3:00 PM',venue:'MetLife Stadium'}];
    document.getElementById('predStageFilter').value='Knockout';
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).notToContain('Group -');
  });
  it('no group-header dividers (replaced by time sort)', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-11',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).notToContain('pred-dark-grp-hdr');
  });

  // Sort by time
  it('sorted by EST time (3pm before 6pm)', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m2',date:'2026-06-11',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'},
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    if(h.indexOf('3:00 PM') > h.indexOf('6:00 PM')) throw new Error('3:00 PM should come before 6:00 PM');
  });
  it('earlier date comes before later date', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m2',date:'2026-06-12',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'9:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    if(h.indexOf('Argentina') > h.indexOf('Brazil')) throw new Error('Jun 11 should appear before Jun 12');
  });

  // Filters
  it('date filter works', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-12',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    predDateFilter='2026-06-11'; renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Argentina'); expect(h).notToContain('Brazil');
  });
  it('show-unpredicted filter works', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[
      {id:'m1',date:'2026-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-12',team1:'Brazil',team2:'Germany',group:'B',stage:'Group Stage',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    predictions={'Saju':{m1:{s1:2,s2:1}}};
    document.getElementById('showUnpredicted').checked=true; renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('Brazil'); expect(h).notToContain('Argentina');
  });

  // Locking
  it('actual score shown when available', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:3,s2:1}}; renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-actual'); expect(h).toContain('Actual: 3-1');
  });
  it('locked badge shown for past match', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('pred-dark-lock'); expect(h).toContain('Locked');
  });
  it('inputs disabled for past match', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var inputs=document.querySelectorAll('#predictContainer input[disabled]');
    if(inputs.length!==2) throw new Error('Expected 2 disabled inputs, got '+inputs.length);
  });
  it('inputs enabled for future match', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2099-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredictions();
    var inputs=document.querySelectorAll('#predictContainer input[disabled]');
    if(inputs.length!==0) throw new Error('Expected 0 disabled inputs, got '+inputs.length);
  });

  // Points badges
  it('+3 pts for exact score', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}}; predictions={'Saju':{m1:{s1:2,s2:1}}};
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('score-exact'); expect(h).toContain('+3 pts');
  });
  it('+1 pt for correct result', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}}; predictions={'Saju':{m1:{s1:3,s2:0}}};
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('score-result'); expect(h).toContain('+1 pt');
  });
  it('0 pts for wrong prediction', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2020-06-11',team1:'Argentina',team2:'France',group:'A',stage:'Group Stage',time:'3:00 PM',venue:'MetLife Stadium'}];
    actualScores={m1:{s1:2,s2:1}}; predictions={'Saju':{m1:{s1:0,s2:2}}};
    renderPredictions();
    var h=document.getElementById('predictContainer').innerHTML;
    expect(h).toContain('score-wrong'); expect(h).toContain('0 pts');
  });

  // Knockout
  it('knockout stage header shown', function(){
    resetState(); pinVerified=true; currentUser='Saju';
    matches=[{id:'m1',date:'2099-07-01',team1:'TBD',team2:'TBD',group:'-',stage:'Quarterfinal',time:'3:00 PM',venue:'MetLife Stadium'}];
    document.getElementById('predStageFilter').value='Knockout'; renderPredictions();
    expect(document.getElementById('predictContainer').innerHTML).toContain('Quarterfinal');
  });
  it('group filter hidden for knockout', function(){
    resetState(); pinVerified=true; currentUser='Saju'; matches=[];
    document.getElementById('predStageFilter').value='Knockout'; renderPredictions();
    expect(document.getElementById('predGroupFilter').style.display).toBe('none');
  });
});

// 8. renderPredDateButtons
describe('renderPredDateButtons() - date filter buttons', function() {
  var todayStr=(function(){ var n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); })();

  it('date row hidden for Knockout', function(){
    resetState(); document.getElementById('predStageFilter').value='Knockout';
    renderPredDateButtons();
    expect(document.getElementById('predDateRow').style.display).toBe('none');
  });
  it('date row shown for Group Stage', function(){
    resetState(); matches=[{id:'m1',date:'2026-06-11',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateRow').style.display).toBe('flex');
  });
  it('All button always present', function(){
    resetState(); matches=[{id:'m1',date:'2026-06-11',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).toContain('>All<');
  });
  it('today highlighted with zap marker', function(){
    resetState();
    matches=[
      {id:'m1',date:todayStr,stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'},
      {id:'m2',date:'2026-06-01',stage:'Group Stage',team1:'C',team2:'D',group:'B',time:'6:00 PM',venue:'MetLife Stadium'}
    ];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).toContain('zap ');
  });
  it('no zap marker for non-today dates', function(){
    resetState(); matches=[{id:'m1',date:'2026-06-01',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).notToContain('zap ');
  });
  it('selected date gets navy background', function(){
    resetState(); predDateFilter='2026-06-11';
    matches=[{id:'m1',date:'2026-06-11',stage:'Group Stage',team1:'A',team2:'B',group:'A',time:'3:00 PM',venue:'MetLife Stadium'}];
    renderPredDateButtons();
    expect(document.getElementById('predDateBtns').innerHTML).toContain('background:var(--navy)');
  });
  it('setPredDate updates predDateFilter', function(){
    resetState(); matches=[]; setPredDate('2026-06-15');
    expect(predDateFilter).toBe('2026-06-15');
  });
  it('setPredDate resets with empty string', function(){
    resetState(); predDateFilter='2026-06-11'; matches=[]; setPredDate('');
    expect(predDateFilter).toBe('');
  });
});

// =============================================================
// RENDER RESULTS
// =============================================================
var totalPass=0, totalFail=0;
var resultsEl=document.getElementById('results');

suites.forEach(function(suite) {
  var sp=suite.tests.filter(function(t){ return t.pass; }).length;
  var sf=suite.tests.filter(function(t){ return !t.pass; }).length;
  totalPass+=sp; totalFail+=sf;

  var suiteEl=document.createElement('div');
  suiteEl.className='suite';

  var hdr=document.createElement('div');
  hdr.className='suite-title';
  hdr.innerHTML=suite.name+'<span style="float:right;font-weight:400;font-size:.85rem">'+sp+'/'+suite.tests.length+' passed</span>';
  suiteEl.appendChild(hdr);

  suite.tests.forEach(function(t) {
    var div=document.createElement('div');
    div.className='test '+(t.pass?'pass':'fail');
    var badge=document.createElement('span');
    badge.className='badge '+(t.pass?'pass':'fail');
    badge.textContent=t.pass?'PASS':'FAIL';
    var nameDiv=document.createElement('div');
    nameDiv.className='test-name';
    nameDiv.textContent=t.name;
    if(t.err) {
      var errDiv=document.createElement('div');
      errDiv.className='test-err';
      errDiv.textContent=t.err;
      nameDiv.appendChild(errDiv);
    }
    div.appendChild(badge);
    div.appendChild(nameDiv);
    suiteEl.appendChild(div);
  });
  resultsEl.appendChild(suiteEl);
});

var summaryEl=document.getElementById('summary');
summaryEl.className='summary '+(totalFail===0?'all-pass':'has-fail');
summaryEl.textContent=totalFail===0
  ? 'All '+totalPass+' tests passed'
  : totalFail+' test'+(totalFail>1?'s':'')+' failed, '+totalPass+' passed ('+(totalPass+totalFail)+' total)';

document.title=(totalFail===0?'PASS':'FAIL')+' '+totalPass+'/'+(totalPass+totalFail)+' - FIFA 2026 Tests';
