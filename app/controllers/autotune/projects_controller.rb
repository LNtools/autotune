require_dependency 'autotune/application_controller'

module Autotune
  # API for projects
  class ProjectsController < ApplicationController
    before_action :respond_to_html
    before_action :require_superuser, :only => [:update_snapshot]
    model Project

    rescue_from ActiveRecord::UnknownAttributeError do |exc|
      render_error exc.message, :bad_request
    end

    def new; end

    def edit; end

    def index
      @projects = Project
      query = {}
      query[:status] = params[:status] if params.key? :status
      query[:theme] = params[:theme] if params.key? :theme
      query[:blueprint_id] = params[:blueprint_id] if params.key? :blueprint_id
      @projects = @projects.search(params[:search]) if params.key? :search
      if query.empty?
        @projects = @projects.all
      else
        @projects = @projects.where(query)
      end
    end

    def show
      @project = instance
    end

    def create
      data = request.POST.dup
      blueprint = Blueprint.find(data.delete 'blueprint_id')
      @project = Project.new
      @project.blueprint = blueprint
      @project.attributes = select_from_post :title, :slug, :theme, :data
      if @project.valid?
        @project.save
        @project.build
        render :show, :status => :created
      else
        render_error @project.errors.full_messages.join(', '), :bad_request
      end
    end

    def update
      @project = instance
      @project.attributes = select_from_post :title, :slug, :theme, :data
      if @project.valid?
        @project.save
        @project.build
        render :show
      else
        render_error @project.errors.full_messages.join(', '), :bad_request
      end
    end

    def update_snapshot
      instance.update_snapshot
      render_accepted
    end

    def build
      instance.build
      render_accepted
    end

    def build_and_publish
      instance.build_and_publish
      render_accepted
    end

    def destroy
      @project = instance
      if @project.destroy
        head :no_content
      else
        render_error @project.errors.full_messages.join(', '), :bad_request
      end
    end
  end
end
