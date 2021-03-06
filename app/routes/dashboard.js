App.DashboardRoute = App.AuthenticatedRoute.extend({
  model: function() {
    return Ember.RSVP.hash({
      sources: this.store.find('source'),
      statuses: this.store.find('status'),
      notificationRequests: this.store.find('notificationRequest')
    });
  },

  setupController: function(controller, model) {
    // Associated notification requests with relevant sources
    model.notificationRequests.forEach(function(notificationRequest) {
      model.sources.forEach(function(source) {
        if (notificationRequest.get('source') == source) {
          source.set('notificationRequest', notificationRequest);
          return;
        }
      });
    });

    // Associated statuses with relevant content types
    model.statuses.forEach(function(status) {
      model.sources.forEach(function(source) {
        source.get('contentTypes').forEach(function(contentType) {
          if (status.get('source') == source && status.get('contentType') == contentType) {
            contentType.set('status', status);
            return;
          }
        });
      });
    });

    controller.set('model', model);

    var store = this.store;
    socket.on('statusesUpdate', function(data) {
      var statusesPayload = {
        statuses: data.statuses
      };

      var itemsPayload = {
        items: data.items
      };

      var lastItem = store.all('item').get('lastObject');
      var newItem = store.push('item', itemsPayload.items[0]);

      if (!lastItem || lastItem.get('syncVerifiedAt') < newItem.get('syncVerifiedAt')) {
        store.pushPayload('status', statusesPayload);
      }
    });
  }
});